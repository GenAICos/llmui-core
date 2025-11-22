#!/usr/bin/env python3
"""
LLMUI Core v2.0 - Installation Error Handler
Détecte et résout automatiquement les erreurs d'installation
Author: François Chalut | contact@llmui.org
"""

import re
import subprocess
import platform
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass


@dataclass
class ErrorSolution:
    """Représente une solution à une erreur"""
    error_pattern: str
    description: str
    commands: List[str]
    package_name: Optional[str] = None
    is_system_package: bool = True
    auto_fix: bool = True


class InstallationErrorHandler:
    """Gestionnaire intelligent d'erreurs d'installation"""
    
    def __init__(self):
        self.os_type = platform.system().lower()
        self.distro = self._detect_distro()
        self.solutions = self._initialize_solutions()
    
    def _detect_distro(self) -> str:
        """Détecte la distribution Linux"""
        if self.os_type != 'linux':
            return self.os_type
        
        try:
            with open('/etc/os-release', 'r') as f:
                content = f.read().lower()
                if 'ubuntu' in content or 'debian' in content:
                    return 'debian'
                elif 'fedora' in content or 'rhel' in content or 'centos' in content or 'rocky' in content:
                    return 'redhat'
                elif 'arch' in content or 'manjaro' in content:
                    return 'arch'
                elif 'opensuse' in content or 'suse' in content:
                    return 'suse'
                elif 'alpine' in content:
                    return 'alpine'
        except Exception:
            pass
        
        return 'unknown'
    
    def _initialize_solutions(self) -> Dict[str, ErrorSolution]:
        """Initialise la base de solutions"""
        solutions = {}
        
        # ============================================================
        # ERREURS PYTHON COMMUNES
        # ============================================================
        
        solutions['missing_python_dev'] = ErrorSolution(
            error_pattern=r'(Python\.h|pyconfig\.h).*not found|error: command.*gcc.*failed',
            description="Outils de développement Python manquants",
            commands=self._get_install_cmd(['python3-dev', 'python3-devel', 'python', 'build-essential', 'base-devel', 'build-base'])
        )
        
        solutions['missing_pip'] = ErrorSolution(
            error_pattern=r'No module named (pip|ensurepip)',
            description="pip n'est pas installé",
            commands=self._get_install_cmd(['python3-pip', 'python-pip', 'py3-pip'])
        )
        
        solutions['missing_venv'] = ErrorSolution(
            error_pattern=r'No module named (venv|virtualenv)',
            description="Module venv manquant",
            commands=self._get_install_cmd(['python3-venv', 'python-virtualenv'])
        )
        
        # ============================================================
        # ERREURS DE VERSIONS DE PACKAGES PYTHON
        # ============================================================
        
        solutions['package_version_not_found'] = ErrorSolution(
            error_pattern=r'Could not find a version that satisfies the requirement\s+([a-zA-Z0-9_-]+)==([0-9.]+)',
            description="Version spécifique d'un package Python introuvable",
            commands=['# Version spécifique introuvable, installation de la dernière version'],
            is_system_package=False,
            auto_fix=False  # Nécessite intervention manuelle
        )
        
        solutions['no_matching_distribution'] = ErrorSolution(
            error_pattern=r'No matching distribution found for\s+([a-zA-Z0-9_-]+)',
            description="Package Python introuvable",
            commands=['# Package introuvable, vérifier le nom ou la disponibilité'],
            is_system_package=False,
            auto_fix=False
        )
        
        # ============================================================
        # ERREURS DE DÉPENDANCES SYSTÈME
        # ============================================================
        
        solutions['missing_gcc'] = ErrorSolution(
            error_pattern=r'gcc.*not found|unable to execute.*gcc',
            description="Compilateur GCC manquant",
            commands=self._get_install_cmd(['gcc', 'g++', 'build-essential', 'base-devel'])
        )
        
        solutions['missing_make'] = ErrorSolution(
            error_pattern=r'make.*not found',
            description="Outil make manquant",
            commands=self._get_install_cmd(['make'])
        )
        
        solutions['missing_openssl'] = ErrorSolution(
            error_pattern=r'openssl.*not found|ssl\.h.*not found',
            description="Bibliothèques OpenSSL manquantes",
            commands=self._get_install_cmd(['libssl-dev', 'openssl-devel', 'openssl'])
        )
        
        solutions['missing_sqlite'] = ErrorSolution(
            error_pattern=r'sqlite3\.h.*not found',
            description="Bibliothèques SQLite manquantes",
            commands=self._get_install_cmd(['libsqlite3-dev', 'sqlite-devel', 'sqlite'])
        )
        
        solutions['missing_zlib'] = ErrorSolution(
            error_pattern=r'zlib.*not found',
            description="Bibliothèques zlib manquantes",
            commands=self._get_install_cmd(['zlib1g-dev', 'zlib-devel', 'zlib'])
        )
        
        solutions['missing_libffi'] = ErrorSolution(
            error_pattern=r'ffi\.h.*not found|libffi.*not found',
            description="Bibliothèques libffi manquantes",
            commands=self._get_install_cmd(['libffi-dev', 'libffi-devel', 'libffi'])
        )
        
        solutions['missing_libbz2'] = ErrorSolution(
            error_pattern=r'bzlib\.h.*not found',
            description="Bibliothèques bzip2 manquantes",
            commands=self._get_install_cmd(['libbz2-dev', 'bzip2-devel', 'bzip2-dev'])
        )
        
        solutions['missing_libreadline'] = ErrorSolution(
            error_pattern=r'readline.*not found',
            description="Bibliothèques readline manquantes",
            commands=self._get_install_cmd(['libreadline-dev', 'readline-devel', 'readline'])
        )
        
        # ============================================================
        # ERREURS DE PACKAGES PYTHON SPÉCIFIQUES
        # ============================================================
        
        solutions['cryptography_deps'] = ErrorSolution(
            error_pattern=r'(cryptography|cffi).*failed|cargo.*not found|rustc.*not found',
            description="Dépendances pour cryptography manquantes (Rust)",
            commands=self._get_install_cmd([
                'libffi-dev', 'libssl-dev', 'python3-dev',
                'cargo', 'rustc', 'rust'
            ])
        )
        
        solutions['psutil_deps'] = ErrorSolution(
            error_pattern=r'psutil.*failed',
            description="Dépendances pour psutil manquantes",
            commands=self._get_install_cmd(['gcc', 'python3-dev', 'python-devel'])
        )
        
        solutions['pillow_deps'] = ErrorSolution(
            error_pattern=r'(Pillow|PIL).*failed|jpeg.*not found|zlib.*not found',
            description="Dépendances pour Pillow manquantes",
            commands=self._get_install_cmd([
                'libjpeg-dev', 'zlib1g-dev', 'libpng-dev', 'libtiff-dev',
                'libjpeg-turbo-devel', 'libpng-devel', 'libtiff-devel'
            ])
        )
        
        solutions['lxml_deps'] = ErrorSolution(
            error_pattern=r'lxml.*failed|libxml.*not found|libxslt.*not found',
            description="Dépendances pour lxml manquantes",
            commands=self._get_install_cmd([
                'libxml2-dev', 'libxslt1-dev',
                'libxml2-devel', 'libxslt-devel'
            ])
        )
        
        solutions['numpy_deps'] = ErrorSolution(
            error_pattern=r'numpy.*failed|blas.*not found|lapack.*not found',
            description="Dépendances pour numpy manquantes",
            commands=self._get_install_cmd([
                'libopenblas-dev', 'liblapack-dev', 'gfortran',
                'openblas-devel', 'lapack-devel'
            ])
        )
        
        # ============================================================
        # ERREURS DE PERMISSIONS
        # ============================================================
        
        solutions['permission_denied'] = ErrorSolution(
            error_pattern=r'Permission denied',
            description="Permissions insuffisantes",
            commands=['# Réexécutez avec sudo'],
            is_system_package=False,
            auto_fix=False
        )
        
        solutions['permission_venv'] = ErrorSolution(
            error_pattern=r'cannot create directory|mkdir.*Permission denied',
            description="Impossible de créer le répertoire (permissions)",
            commands=['# Vérifiez les permissions du dossier parent'],
            is_system_package=False,
            auto_fix=False
        )
        
        # ============================================================
        # ERREURS RÉSEAU
        # ============================================================
        
        solutions['network_timeout'] = ErrorSolution(
            error_pattern=r'Connection.*timed out|Network.*unreachable|ReadTimeoutError',
            description="Problème de connexion réseau",
            commands=['# Vérifiez votre connexion internet et les proxies'],
            is_system_package=False,
            auto_fix=False
        )
        
        solutions['pypi_unavailable'] = ErrorSolution(
            error_pattern=r'Could not fetch URL.*pypi\.org',
            description="PyPI inaccessible",
            commands=['# PyPI temporairement indisponible, réessayez plus tard'],
            is_system_package=False,
            auto_fix=False
        )
        
        # ============================================================
        # ERREURS DISK SPACE
        # ============================================================
        
        solutions['disk_full'] = ErrorSolution(
            error_pattern=r'No space left on device',
            description="Espace disque insuffisant",
            commands=['# Libérez de l\'espace disque'],
            is_system_package=False,
            auto_fix=False
        )
        
        return solutions
    
    def _get_install_cmd(self, packages: List[str]) -> List[str]:
        """Génère les commandes d'installation selon la distro"""
        if self.distro == 'debian':
            # Ubuntu, Debian
            debian_pkgs = [p for p in packages if not any(x in p for x in ['-devel', 'base-devel', 'py3-'])]
            if debian_pkgs:
                return [
                    'apt-get update -qq',
                    f'apt-get install -y {" ".join(debian_pkgs)}'
                ]
        
        elif self.distro == 'redhat':
            # CentOS, RHEL, Rocky, Fedora
            redhat_pkgs = []
            for pkg in packages:
                redhat_pkg = (pkg.replace('-dev', '-devel')
                                 .replace('libssl', 'openssl')
                                 .replace('zlib1g', 'zlib')
                                 .replace('python3-', 'python-')
                                 .replace('libjpeg-turbo', 'libjpeg-turbo')
                                 .replace('libpng', 'libpng')
                                 .replace('build-essential', 'gcc gcc-c++ make'))
                if redhat_pkg and redhat_pkg not in ['base-devel', 'py3-']:
                    redhat_pkgs.append(redhat_pkg)
            
            if redhat_pkgs:
                # Utilise dnf si disponible, sinon yum
                pkg_manager = 'dnf' if self._command_exists('dnf') else 'yum'
                return [f'{pkg_manager} install -y {" ".join(set(redhat_pkgs))}']
        
        elif self.distro == 'arch':
            # Arch, Manjaro
            arch_pkgs = []
            for pkg in packages:
                arch_pkg = (pkg.replace('python3-dev', 'python')
                               .replace('python3-', 'python-')
                               .replace('-dev', '')
                               .replace('-devel', '')
                               .replace('lib', '')
                               .replace('build-essential', 'base-devel')
                               .replace('g++', 'gcc'))
                if arch_pkg and arch_pkg not in ['py3-']:
                    arch_pkgs.append(arch_pkg)
            
            if arch_pkgs:
                return [f'pacman -S --noconfirm {" ".join(set(arch_pkgs))}']
        
        elif self.distro == 'suse':
            # openSUSE
            suse_pkgs = []
            for pkg in packages:
                suse_pkg = pkg.replace('-dev', '-devel').replace('python3-', 'python-')
                if suse_pkg and suse_pkg not in ['base-devel', 'py3-']:
                    suse_pkgs.append(suse_pkg)
            
            if suse_pkgs:
                return [f'zypper install -y {" ".join(set(suse_pkgs))}']
        
        elif self.distro == 'alpine':
            # Alpine Linux
            alpine_pkgs = []
            for pkg in packages:
                alpine_pkg = (pkg.replace('-dev', '-dev')
                                 .replace('python3-', 'py3-')
                                 .replace('libssl-dev', 'openssl-dev')
                                 .replace('build-essential', 'build-base'))
                if alpine_pkg:
                    alpine_pkgs.append(alpine_pkg)
            
            if alpine_pkgs:
                return [f'apk add {" ".join(set(alpine_pkgs))}']
        
        # Fallback: instructions manuelles
        return [f'# Installez manuellement: {" ".join(set(packages))}']
    
    def _command_exists(self, command: str) -> bool:
        """Vérifie si une commande existe"""
        try:
            subprocess.run(['which', command], capture_output=True, check=True)
            return True
        except:
            return False
    
    def analyze_error(self, error_output: str) -> List[Tuple[str, ErrorSolution]]:
        """Analyse une erreur et retourne les solutions possibles"""
        matches = []
        
        for name, solution in self.solutions.items():
            if re.search(solution.error_pattern, error_output, re.IGNORECASE | re.MULTILINE):
                matches.append((name, solution))
        
        return matches
    
    def extract_package_version_error(self, error_output: str) -> Optional[Dict[str, str]]:
        """Extrait les infos d'erreur de version de package"""
        # Pattern: "Could not find a version that satisfies the requirement torch==2.1.0"
        pattern1 = r'Could not find a version that satisfies the requirement\s+([a-zA-Z0-9_-]+)==([0-9.]+)'
        match1 = re.search(pattern1, error_output, re.IGNORECASE)
        
        if match1:
            package_name = match1.group(1)
            requested_version = match1.group(2)
            
            # Tente d'extraire les versions disponibles
            available_pattern = r'from versions:\s+([0-9., ]+)'
            match2 = re.search(available_pattern, error_output, re.IGNORECASE)
            
            available_versions = []
            if match2:
                versions_str = match2.group(1)
                available_versions = [v.strip() for v in versions_str.split(',')]
            
            return {
                'package': package_name,
                'requested_version': requested_version,
                'available_versions': available_versions,
                'suggested_version': available_versions[-1] if available_versions else 'latest'
            }
        
        return None
    
    def extract_missing_package(self, error_output: str) -> Optional[str]:
        """Extrait le nom d'un package manquant depuis l'erreur"""
        patterns = [
            r"No module named ['\"]([^'\"]+)['\"]",
            r"ImportError:.*['\"]([^'\"]+)['\"]",
            r"ModuleNotFoundError:.*['\"]([^'\"]+)['\"]",
            r"Could not find a version.*\s+([a-zA-Z0-9_-]+)",
            r"No matching distribution found for\s+([a-zA-Z0-9_-]+)",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, error_output)
            if match:
                return match.group(1)
        
        return None
    
    def suggest_pip_alternative(self, package_name: str) -> Optional[str]:
        """Suggère un package alternatif si l'original n'existe pas"""
        alternatives = {
            'yaml': 'pyyaml',
            'Image': 'Pillow',
            'cv2': 'opencv-python',
            'sklearn': 'scikit-learn',
            'dateutil': 'python-dateutil',
            'PIL': 'Pillow',
            'bs4': 'beautifulsoup4',
        }
        
        return alternatives.get(package_name)
    
    def fix_requirements_file(self, requirements_file: str, package: str, new_version: str = None) -> bool:
        """Modifie un fichier requirements.txt pour corriger une version"""
        try:
            with open(requirements_file, 'r') as f:
                lines = f.readlines()
            
            new_lines = []
            fixed = False
            
            for line in lines:
                if line.strip().startswith(package):
                    if new_version:
                        new_line = f'{package}=={new_version}\n'
                    else:
                        # Enlève la version spécifique
                        new_line = f'{package}\n'
                    new_lines.append(new_line)
                    fixed = True
                    print(f"📝 requirements.txt: {line.strip()} → {new_line.strip()}")
                else:
                    new_lines.append(line)
            
            if fixed:
                with open(requirements_file, 'w') as f:
                    f.writelines(new_lines)
                return True
            
            return False
            
        except Exception as e:
            print(f"❌ Erreur modification requirements.txt: {e}")
            return False
    
    def try_fix(self, error_output: str, auto_fix: bool = False, requirements_file: str = None) -> Dict:
        """Tente de corriger automatiquement l'erreur"""
        result = {
            'analyzed': True,
            'solutions_found': [],
            'applied_fixes': [],
            'success': False,
            'message': '',
            'requires_manual_action': False
        }
        
        # Vérifie d'abord les erreurs de version de packages
        version_error = self.extract_package_version_error(error_output)
        if version_error:
            pkg = version_error['package']
            req_ver = version_error['requested_version']
            avail_vers = version_error['available_versions']
            sugg_ver = version_error['suggested_version']
            
            result['solutions_found'].append({
                'type': 'package_version_mismatch',
                'package': pkg,
                'requested_version': req_ver,
                'available_versions': avail_vers,
                'suggested_version': sugg_ver
            })
            
            result['message'] = f"""
📦 Erreur de version détectée:
   Package: {pkg}
   Version demandée: {req_ver}
   Versions disponibles: {', '.join(avail_vers[:5])}{'...' if len(avail_vers) > 5 else ''}
   
💡 Solutions:
   1. Utiliser la dernière version: {sugg_ver}
   2. Modifier requirements.txt pour enlever la version spécifique
   
✅ Action recommandée:
   pip install {pkg}  # Sans version spécifique
   OU
   pip install {pkg}=={sugg_ver}  # Dernière version disponible
"""
            
            # Si auto_fix et requirements_file fourni, modifie le fichier
            if auto_fix and requirements_file:
                if self.fix_requirements_file(requirements_file, pkg, sugg_ver):
                    result['applied_fixes'].append(f'Modified {requirements_file}: {pkg}=={sugg_ver}')
                    result['success'] = True
                    result['message'] += f"\n✅ requirements.txt modifié automatiquement"
                else:
                    result['requires_manual_action'] = True
            else:
                result['requires_manual_action'] = True
            
            return result
        
        # Analyse l'erreur avec les patterns standards
        solutions = self.analyze_error(error_output)
        
        if not solutions:
            result['analyzed'] = False
            result['message'] = "Aucune solution connue pour cette erreur"
            
            # Tente d'extraire un package manquant
            missing_pkg = self.extract_missing_package(error_output)
            if missing_pkg:
                result['message'] += f"\n📦 Package manquant détecté: {missing_pkg}"
                alt = self.suggest_pip_alternative(missing_pkg)
                if alt:
                    result['message'] += f"\n💡 Essayez: pip install {alt}"
            
            return result
        
        # Collecte les solutions
        for name, solution in solutions:
            result['solutions_found'].append({
                'name': name,
                'description': solution.description,
                'commands': solution.commands,
                'auto_fix': solution.auto_fix
            })
        
        # Application automatique si demandé
        if auto_fix:
            for name, solution in solutions:
                if solution.auto_fix and solution.is_system_package and solution.commands:
                    try:
                        for cmd in solution.commands:
                            if not cmd.startswith('#'):
                                print(f"🔧 Exécution: {cmd}")
                                subprocess.run(
                                    cmd,
                                    shell=True,
                                    check=True,
                                    capture_output=True,
                                    timeout=300
                                )
                                result['applied_fixes'].append(cmd)
                        result['success'] = True
                    except Exception as e:
                        result['message'] = f"Erreur lors de l'application: {str(e)}"
                        break
                elif not solution.auto_fix:
                    result['requires_manual_action'] = True
        
        if result['success']:
            result['message'] = "✅ Corrections appliquées avec succès"
        elif result['requires_manual_action']:
            result['message'] = "⚠️  Action manuelle requise (voir solutions)"
        elif not auto_fix:
            result['message'] = "Solutions trouvées (utilisez auto_fix=True pour appliquer)"
        
        return result
    
    def format_solution_message(self, solutions: List[Tuple[str, ErrorSolution]]) -> str:
        """Formate un message d'aide avec les solutions"""
        if not solutions:
            return "❌ Aucune solution automatique trouvée"
        
        msg = "🔧 Solutions détectées:\n\n"
        
        for i, (name, solution) in enumerate(solutions, 1):
            msg += f"{i}. {solution.description}\n"
            msg += "   Commandes:\n"
            for cmd in solution.commands:
                msg += f"   $ {cmd}\n"
            msg += "\n"
        
        return msg


def test_error_handler():
    """Test du gestionnaire d'erreurs"""
    handler = InstallationErrorHandler()
    
    print("=" * 70)
    print(f" 🧪 Test du gestionnaire d'erreurs - Distro: {handler.distro}")
    print("=" * 70)
    
    # Test avec différentes erreurs
    test_cases = [
        ("fatal error: Python.h: No such file or directory", "python_dev"),
        ("No module named 'venv'", "venv"),
        ("gcc: command not found", "gcc"),
        ("ModuleNotFoundError: No module named 'yaml'", "yaml"),
        ("ERROR: Could not find a version that satisfies the requirement torch==2.1.0 (from versions: 2.5.0, 2.5.1, 2.6.0, 2.7.0) ERROR: No matching distribution found for torch==2.1.0", "torch_version"),
    ]
    
    for error, desc in test_cases:
        print(f"\n📋 Test: {desc}")
        print(f"   Erreur: {error[:60]}...")
        
        # Test extraction version error
        if "torch" in desc:
            version_info = handler.extract_package_version_error(error)
            if version_info:
                print(f"\n   📦 Package: {version_info['package']}")
                print(f"   ❌ Version demandée: {version_info['requested_version']}")
                print(f"   ✅ Versions disponibles: {', '.join(version_info['available_versions'][:3])}")
                print(f"   💡 Version suggérée: {version_info['suggested_version']}")
        
        result = handler.try_fix(error, auto_fix=False)
        
        if result['solutions_found']:
            for sol in result['solutions_found']:
                print(f"\n   🔧 {sol.get('description', sol.get('type', 'Solution'))}")
                if 'commands' in sol:
                    for cmd in sol['commands'][:2]:
                        print(f"      $ {cmd}")
        else:
            print(f"   {result['message']}")
    
    print("\n" + "=" * 70)


if __name__ == '__main__':
    test_error_handler()
    
    def _initialize_solutions(self) -> Dict[str, ErrorSolution]:
        """Initialise la base de solutions"""
        solutions = {}
        
        # Erreurs Python communes
        solutions['missing_python_dev'] = ErrorSolution(
            error_pattern=r'(Python\.h|pyconfig\.h).*not found|error: command.*gcc.*failed',
            description="Outils de développement Python manquants",
            commands=self._get_install_cmd(['python3-dev', 'python3-devel', 'build-essential'])
        )
        
        solutions['missing_pip'] = ErrorSolution(
            error_pattern=r'No module named (pip|ensurepip)',
            description="pip n'est pas installé",
            commands=self._get_install_cmd(['python3-pip'])
        )
        
        solutions['missing_venv'] = ErrorSolution(
            error_pattern=r'No module named (venv|virtualenv)',
            description="Module venv manquant",
            commands=self._get_install_cmd(['python3-venv'])
        )
        
        # Erreurs de dépendances système
        solutions['missing_gcc'] = ErrorSolution(
            error_pattern=r'gcc.*not found|unable to execute.*gcc',
            description="Compilateur GCC manquant",
            commands=self._get_install_cmd(['gcc', 'g++', 'build-essential'])
        )
        
        solutions['missing_make'] = ErrorSolution(
            error_pattern=r'make.*not found',
            description="Outil make manquant",
            commands=self._get_install_cmd(['make'])
        )
        
        solutions['missing_openssl'] = ErrorSolution(
            error_pattern=r'openssl.*not found|ssl\.h.*not found',
            description="Bibliothèques OpenSSL manquantes",
            commands=self._get_install_cmd(['libssl-dev', 'openssl-devel', 'openssl'])
        )
        
        solutions['missing_sqlite'] = ErrorSolution(
            error_pattern=r'sqlite3\.h.*not found',
            description="Bibliothèques SQLite manquantes",
            commands=self._get_install_cmd(['libsqlite3-dev', 'sqlite-devel'])
        )
        
        solutions['missing_zlib'] = ErrorSolution(
            error_pattern=r'zlib.*not found',
            description="Bibliothèques zlib manquantes",
            commands=self._get_install_cmd(['zlib1g-dev', 'zlib-devel'])
        )
        
        # Erreurs de packages Python spécifiques
        solutions['cryptography_deps'] = ErrorSolution(
            error_pattern=r'(cryptography|cffi).*failed|cargo.*not found',
            description="Dépendances pour cryptography manquantes",
            commands=self._get_install_cmd([
                'libffi-dev', 'libssl-dev', 'python3-dev',
                'cargo', 'rustc'
            ])
        )
        
        solutions['psutil_deps'] = ErrorSolution(
            error_pattern=r'psutil.*failed',
            description="Dépendances pour psutil manquantes",
            commands=self._get_install_cmd(['gcc', 'python3-dev'])
        )
        
        # Erreurs de permissions
        solutions['permission_denied'] = ErrorSolution(
            error_pattern=r'Permission denied',
            description="Permissions insuffisantes",
            commands=['# Réexécutez avec sudo'],
            is_system_package=False
        )
        
        # Erreurs réseau
        solutions['network_timeout'] = ErrorSolution(
            error_pattern=r'Connection.*timed out|Network.*unreachable',
            description="Problème de connexion réseau",
            commands=['# Vérifiez votre connexion internet'],
            is_system_package=False
        )
        
        return solutions
    
    def _get_install_cmd(self, packages: List[str]) -> List[str]:
        """Génère les commandes d'installation selon la distro"""
        if self.distro == 'debian':
            return [
                'apt-get update',
                f'apt-get install -y {" ".join(packages)}'
            ]
        elif self.distro == 'redhat':
            # Convertit les noms de packages Debian -> RedHat
            redhat_pkgs = []
            for pkg in packages:
                redhat_pkgs.append(
                    pkg.replace('-dev', '-devel')
                       .replace('libssl', 'openssl')
                       .replace('zlib1g', 'zlib')
                )
            return [f'yum install -y {" ".join(redhat_pkgs)}']
        elif self.distro == 'arch':
            arch_pkgs = []
            for pkg in packages:
                arch_pkgs.append(
                    pkg.replace('python3-dev', 'python')
                       .replace('-dev', '')
                       .replace('lib', '')
                )
            return [f'pacman -S --noconfirm {" ".join(arch_pkgs)}']
        else:
            return [f'# Install manually: {" ".join(packages)}']
    
    def analyze_error(self, error_output: str) -> List[Tuple[str, ErrorSolution]]:
        """Analyse une erreur et retourne les solutions possibles"""
        matches = []
        
        for name, solution in self.solutions.items():
            if re.search(solution.error_pattern, error_output, re.IGNORECASE):
                matches.append((name, solution))
        
        return matches
    
    def extract_missing_package(self, error_output: str) -> Optional[str]:
        """Extrait le nom d'un package manquant depuis l'erreur"""
        patterns = [
            r"No module named ['\"]([^'\"]+)['\"]",
            r"ImportError:.*['\"]([^'\"]+)['\"]",
            r"ModuleNotFoundError:.*['\"]([^'\"]+)['\"]",
            r"Could not find a version.*\s+([a-zA-Z0-9_-]+)",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, error_output)
            if match:
                return match.group(1)
        
        return None
    
    def suggest_pip_alternative(self, package_name: str) -> Optional[str]:
        """Suggère un package alternatif si l'original n'existe pas"""
        alternatives = {
            'yaml': 'pyyaml',
            'Image': 'Pillow',
            'cv2': 'opencv-python',
            'sklearn': 'scikit-learn',
            'dateutil': 'python-dateutil',
        }
        
        return alternatives.get(package_name)
    
    def try_fix(self, error_output: str, auto_fix: bool = False) -> Dict:
        """Tente de corriger automatiquement l'erreur"""
        result = {
            'analyzed': True,
            'solutions_found': [],
            'applied_fixes': [],
            'success': False,
            'message': ''
        }
        
        # Analyse l'erreur
        solutions = self.analyze_error(error_output)
        
        if not solutions:
            result['analyzed'] = False
            result['message'] = "Aucune solution connue pour cette erreur"
            
            # Tente d'extraire un package manquant
            missing_pkg = self.extract_missing_package(error_output)
            if missing_pkg:
                result['message'] += f"\n📦 Package manquant détecté: {missing_pkg}"
                alt = self.suggest_pip_alternative(missing_pkg)
                if alt:
                    result['message'] += f"\n💡 Essayez: pip install {alt}"
            
            return result
        
        # Collecte les solutions
        for name, solution in solutions:
            result['solutions_found'].append({
                'name': name,
                'description': solution.description,
                'commands': solution.commands
            })
        
        # Application automatique si demandé
        if auto_fix and solutions:
            for name, solution in solutions:
                if solution.is_system_package and solution.commands:
                    try:
                        for cmd in solution.commands:
                            if not cmd.startswith('#'):
                                subprocess.run(
                                    cmd,
                                    shell=True,
                                    check=True,
                                    capture_output=True,
                                    timeout=300
                                )
                                result['applied_fixes'].append(cmd)
                        result['success'] = True
                    except Exception as e:
                        result['message'] = f"Erreur lors de l'application: {str(e)}"
                        break
        
        if result['success']:
            result['message'] = "Corrections appliquées avec succès"
        elif not auto_fix:
            result['message'] = "Solutions trouvées (utilisez auto_fix=True pour appliquer)"
        
        return result
    
    def format_solution_message(self, solutions: List[Tuple[str, ErrorSolution]]) -> str:
        """Formate un message d'aide avec les solutions"""
        if not solutions:
            return "❌ Aucune solution automatique trouvée"
        
        msg = "🔧 Solutions détectées:\n\n"
        
        for i, (name, solution) in enumerate(solutions, 1):
            msg += f"{i}. {solution.description}\n"
            msg += "   Commandes:\n"
            for cmd in solution.commands:
                msg += f"   $ {cmd}\n"
            msg += "\n"
        
        return msg


def test_error_handler():
    """Test du gestionnaire d'erreurs"""
    handler = InstallationErrorHandler()
    
    # Test avec différentes erreurs
    test_cases = [
        "fatal error: Python.h: No such file or directory",
        "No module named 'venv'",
        "gcc: command not found",
        "ModuleNotFoundError: No module named 'yaml'",
        "error: command 'gcc' failed with exit status 1"
    ]
    
    print("=" * 70)
    print(" 🧪 Test du gestionnaire d'erreurs")
    print("=" * 70)
    
    for error in test_cases:
        print(f"\n📋 Erreur: {error[:60]}...")
        result = handler.try_fix(error, auto_fix=False)
        
        if result['solutions_found']:
            print(handler.format_solution_message([
                (name, handler.solutions[sol['name']]) 
                for sol in result['solutions_found'] 
                for name in handler.solutions if name == sol['name']
            ]))
        else:
            print(f"   {result['message']}")


if __name__ == '__main__':
    test_error_handler()
