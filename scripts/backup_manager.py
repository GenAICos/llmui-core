#!/usr/bin/env python3
"""
LLMUI Core v2.0 - Backup Manager
Gère la détection d'installations existantes et les backups
Author: François Chalut | contact@llmui.org
"""

import os
import json
import shutil
import tarfile
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple


class BackupManager:
    """Gestionnaire de backups et d'installations existantes"""
    
    def __init__(self, install_dir: str = '/opt/llmui'):
        self.install_dir = install_dir
        self.backup_dir = '/var/backups/llmui'
        self.data_dir = '/var/lib/llmui'
        self.config_dir = '/etc/llmui'
        
        # Fichiers/dossiers critiques à sauvegarder
        self.critical_paths = [
            self.data_dir,           # Base de données
            self.config_dir,         # Configurations
            f'{self.install_dir}/config.yaml',  # Config principale
        ]
        
        # Services systemd
        self.services = [
            'llmui-backend',
            'llmui-proxy',
            'llmui-monitor',
            'llmui-cleanup'
        ]
    
    def check_existing_installation(self) -> Dict:
        """Vérifie si une installation existe déjà"""
        result = {
            'exists': False,
            'version': None,
            'install_date': None,
            'services': {},
            'paths': {},
            'database_size': 0,
            'can_backup': False,
            'issues': []
        }
        
        # Vérifie le dossier d'installation
        if os.path.exists(self.install_dir):
            result['exists'] = True
            result['paths']['install_dir'] = {
                'exists': True,
                'path': self.install_dir,
                'size': self._get_dir_size(self.install_dir)
            }
            
            # Récupère la version
            version_file = f'{self.install_dir}/VERSION'
            if os.path.exists(version_file):
                try:
                    with open(version_file, 'r') as f:
                        result['version'] = f.read().strip()
                except Exception:
                    pass
            
            # Date d'installation (via modification du dossier)
            try:
                stat = os.stat(self.install_dir)
                result['install_date'] = datetime.fromtimestamp(stat.st_mtime).isoformat()
            except Exception:
                pass
        
        # Vérifie les données
        if os.path.exists(self.data_dir):
            result['paths']['data_dir'] = {
                'exists': True,
                'path': self.data_dir,
                'size': self._get_dir_size(self.data_dir)
            }
            
            # Taille de la base de données
            db_file = f'{self.data_dir}/llmui.db'
            if os.path.exists(db_file):
                result['database_size'] = os.path.getsize(db_file)
                result['paths']['database'] = {
                    'exists': True,
                    'path': db_file,
                    'size': result['database_size']
                }
        
        # Vérifie la config
        if os.path.exists(self.config_dir):
            result['paths']['config_dir'] = {
                'exists': True,
                'path': self.config_dir,
                'size': self._get_dir_size(self.config_dir)
            }
        
        # Vérifie les services
        for service in self.services:
            status = self._check_service_status(service)
            result['services'][service] = status
        
        # Détermine si backup possible
        result['can_backup'] = result['exists'] and (
            result['database_size'] > 0 or 
            any(p.get('exists') for p in result['paths'].values())
        )
        
        # Détecte les problèmes
        if result['exists']:
            # Services en erreur
            failed_services = [
                name for name, status in result['services'].items()
                if status['status'] == 'failed'
            ]
            if failed_services:
                result['issues'].append({
                    'type': 'failed_services',
                    'message': f"Services en erreur: {', '.join(failed_services)}",
                    'severity': 'warning'
                })
            
            # Permissions
            if not os.access(self.install_dir, os.W_OK):
                result['issues'].append({
                    'type': 'permissions',
                    'message': f"Permissions insuffisantes sur {self.install_dir}",
                    'severity': 'error'
                })
        
        return result
    
    def _check_service_status(self, service_name: str) -> Dict:
        """Vérifie le statut d'un service systemd"""
        result = {
            'exists': False,
            'status': 'unknown',
            'enabled': False,
            'active': False
        }
        
        try:
            # Vérifie si le service existe
            check = subprocess.run(
                ['systemctl', 'list-unit-files', f'{service_name}.service'],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if service_name in check.stdout:
                result['exists'] = True
                
                # Obtient le statut
                status = subprocess.run(
                    ['systemctl', 'is-active', service_name],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                result['active'] = status.returncode == 0
                result['status'] = status.stdout.strip()
                
                # Vérifie si enabled
                enabled = subprocess.run(
                    ['systemctl', 'is-enabled', service_name],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                result['enabled'] = enabled.returncode == 0
        
        except Exception:
            pass
        
        return result
    
    def _get_dir_size(self, path: str) -> int:
        """Calcule la taille totale d'un dossier"""
        total = 0
        try:
            for dirpath, dirnames, filenames in os.walk(path):
                for filename in filenames:
                    filepath = os.path.join(dirpath, filename)
                    if os.path.exists(filepath):
                        total += os.path.getsize(filepath)
        except Exception:
            pass
        return total
    
    def create_backup(self, include_data: bool = True) -> Dict:
        """Crée un backup de l'installation actuelle"""
        result = {
            'success': False,
            'backup_path': None,
            'backup_size': 0,
            'included_items': [],
            'excluded_items': [],
            'errors': []
        }
        
        # Crée le dossier de backup
        os.makedirs(self.backup_dir, exist_ok=True)
        
        # Nom du backup avec timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f'llmui_backup_{timestamp}.tar.gz'
        backup_path = f'{self.backup_dir}/{backup_name}'
        
        try:
            with tarfile.open(backup_path, 'w:gz') as tar:
                # Sauvegarde les fichiers critiques
                for path in self.critical_paths:
                    if os.path.exists(path):
                        try:
                            # Nom d'archive sans le / initial
                            arcname = path.lstrip('/')
                            tar.add(path, arcname=arcname)
                            result['included_items'].append(path)
                        except Exception as e:
                            result['errors'].append(f"Erreur sur {path}: {str(e)}")
                            result['excluded_items'].append(path)
                    else:
                        result['excluded_items'].append(f"{path} (n'existe pas)")
                
                # Sauvegarde les fichiers de service
                service_dir = '/etc/systemd/system'
                for service in self.services:
                    service_file = f'{service_dir}/{service}.service'
                    if os.path.exists(service_file):
                        try:
                            tar.add(service_file, arcname=f'systemd/{service}.service')
                            result['included_items'].append(service_file)
                        except Exception as e:
                            result['errors'].append(f"Erreur service {service}: {str(e)}")
                
                # Crée un manifeste JSON avec les métadonnées
                manifest = {
                    'backup_date': datetime.now().isoformat(),
                    'version': self._get_installed_version(),
                    'hostname': os.uname().nodename,
                    'included_items': result['included_items'],
                    'excluded_items': result['excluded_items'],
                    'services': {
                        name: status for name, status in 
                        {s: self._check_service_status(s) for s in self.services}.items()
                    }
                }
                
                # Ajoute le manifeste au backup
                manifest_path = '/tmp/llmui_backup_manifest.json'
                with open(manifest_path, 'w') as f:
                    json.dump(manifest, f, indent=2)
                tar.add(manifest_path, arcname='manifest.json')
                os.remove(manifest_path)
            
            # Calcule la taille
            result['backup_size'] = os.path.getsize(backup_path)
            result['backup_path'] = backup_path
            result['success'] = True
            
            print(f"✅ Backup créé: {backup_path}")
            print(f"   Taille: {self._format_size(result['backup_size'])}")
            print(f"   Éléments: {len(result['included_items'])} inclus, {len(result['excluded_items'])} exclus")
            
        except Exception as e:
            result['errors'].append(f"Erreur création backup: {str(e)}")
        
        return result
    
    def restore_backup(self, backup_path: str, stop_services: bool = True) -> Dict:
        """Restaure un backup"""
        result = {
            'success': False,
            'restored_items': [],
            'errors': [],
            'services_restarted': []
        }
        
        if not os.path.exists(backup_path):
            result['errors'].append(f"Backup introuvable: {backup_path}")
            return result
        
        try:
            # Arrête les services si demandé
            if stop_services:
                for service in self.services:
                    try:
                        subprocess.run(
                            ['systemctl', 'stop', service],
                            capture_output=True,
                            timeout=30
                        )
                    except Exception:
                        pass
            
            # Extrait le backup
            with tarfile.open(backup_path, 'r:gz') as tar:
                # Lit le manifeste
                try:
                    manifest_file = tar.extractfile('manifest.json')
                    manifest = json.load(manifest_file)
                    print(f"📋 Backup du {manifest['backup_date']}")
                    print(f"   Version: {manifest.get('version', 'inconnue')}")
                except Exception:
                    manifest = None
                
                # Extrait tous les fichiers
                tar.extractall('/')
                
                # Liste les fichiers restaurés
                result['restored_items'] = tar.getnames()
            
            # Redémarre les services
            if stop_services:
                for service in self.services:
                    try:
                        subprocess.run(
                            ['systemctl', 'daemon-reload'],
                            capture_output=True,
                            timeout=10
                        )
                        subprocess.run(
                            ['systemctl', 'start', service],
                            capture_output=True,
                            timeout=30
                        )
                        result['services_restarted'].append(service)
                    except Exception as e:
                        result['errors'].append(f"Erreur redémarrage {service}: {str(e)}")
            
            result['success'] = True
            print(f"✅ Backup restauré avec succès")
            print(f"   Fichiers: {len(result['restored_items'])}")
            
        except Exception as e:
            result['errors'].append(f"Erreur restauration: {str(e)}")
        
        return result
    
    def list_backups(self) -> List[Dict]:
        """Liste tous les backups disponibles"""
        backups = []
        
        if not os.path.exists(self.backup_dir):
            return backups
        
        for filename in os.listdir(self.backup_dir):
            if filename.startswith('llmui_backup_') and filename.endswith('.tar.gz'):
                filepath = f'{self.backup_dir}/{filename}'
                
                try:
                    # Extrait la date depuis le nom
                    date_str = filename.replace('llmui_backup_', '').replace('.tar.gz', '')
                    backup_date = datetime.strptime(date_str, '%Y%m%d_%H%M%S')
                    
                    # Lit le manifeste si possible
                    manifest = None
                    try:
                        with tarfile.open(filepath, 'r:gz') as tar:
                            manifest_file = tar.extractfile('manifest.json')
                            manifest = json.load(manifest_file)
                    except Exception:
                        pass
                    
                    backups.append({
                        'filename': filename,
                        'path': filepath,
                        'date': backup_date.isoformat(),
                        'size': os.path.getsize(filepath),
                        'version': manifest.get('version') if manifest else None,
                        'manifest': manifest
                    })
                
                except Exception:
                    continue
        
        # Trie par date (plus récent en premier)
        backups.sort(key=lambda x: x['date'], reverse=True)
        
        return backups
    
    def delete_backup(self, backup_path: str) -> bool:
        """Supprime un backup"""
        try:
            if os.path.exists(backup_path):
                os.remove(backup_path)
                print(f"🗑️  Backup supprimé: {backup_path}")
                return True
        except Exception as e:
            print(f"❌ Erreur suppression: {str(e)}")
        return False
    
    def cleanup_old_backups(self, keep_count: int = 5) -> int:
        """Supprime les vieux backups (garde les N plus récents)"""
        backups = self.list_backups()
        deleted = 0
        
        if len(backups) > keep_count:
            for backup in backups[keep_count:]:
                if self.delete_backup(backup['path']):
                    deleted += 1
        
        return deleted
    
    def _get_installed_version(self) -> Optional[str]:
        """Récupère la version installée"""
        version_file = f'{self.install_dir}/VERSION'
        if os.path.exists(version_file):
            try:
                with open(version_file, 'r') as f:
                    return f.read().strip()
            except Exception:
                pass
        return None
    
    def _format_size(self, size_bytes: int) -> str:
        """Formate une taille en octets de manière lisible"""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} PB"
    
    def print_installation_summary(self, install_info: Dict):
        """Affiche un résumé de l'installation existante"""
        print("\n" + "=" * 70)
        print(" 🔍 Installation LLMUI Détectée")
        print("=" * 70)
        
        if install_info['version']:
            print(f"\n📦 Version: {install_info['version']}")
        
        if install_info['install_date']:
            print(f"📅 Date d'installation: {install_info['install_date']}")
        
        print(f"\n💾 Données:")
        for name, info in install_info['paths'].items():
            if info.get('exists'):
                size = self._format_size(info['size'])
                print(f"   ✅ {name}: {info['path']} ({size})")
        
        if install_info['database_size'] > 0:
            db_size = self._format_size(install_info['database_size'])
            print(f"\n🗄️  Base de données: {db_size}")
        
        print(f"\n🔧 Services:")
        for service, status in install_info['services'].items():
            if status['exists']:
                icon = '✅' if status['active'] else '❌'
                state = status['status']
                enabled = '(enabled)' if status['enabled'] else '(disabled)'
                print(f"   {icon} {service}: {state} {enabled}")
        
        if install_info['issues']:
            print(f"\n⚠️  Problèmes détectés:")
            for issue in install_info['issues']:
                severity_icon = '🔴' if issue['severity'] == 'error' else '🟡'
                print(f"   {severity_icon} {issue['message']}")
        
        print(f"\n💾 Backup possible: {'Oui ✅' if install_info['can_backup'] else 'Non ❌'}")
        print("=" * 70)


def main():
    """Test du gestionnaire de backups"""
    manager = BackupManager()
    
    print("=" * 70)
    print(" 🧪 Test du gestionnaire de backups")
    print("=" * 70)
    
    # Vérifie l'installation existante
    install_info = manager.check_existing_installation()
    manager.print_installation_summary(install_info)
    
    if install_info['exists']:
        print(f"\n📋 Options disponibles:")
        print(f"   1. Créer un backup")
        print(f"   2. Lister les backups")
        print(f"   3. Réinstaller avec backup")
        print(f"   4. Réinstaller sans backup (DANGEREUX)")
        
        # Liste les backups existants
        backups = manager.list_backups()
        if backups:
            print(f"\n💾 Backups existants ({len(backups)}):")
            for backup in backups[:3]:  # Affiche les 3 plus récents
                size = manager._format_size(backup['size'])
                version = f"v{backup['version']}" if backup['version'] else 'inconnue'
                print(f"   📦 {backup['filename']}")
                print(f"      Date: {backup['date']} | Taille: {size} | Version: {version}")
    else:
        print(f"\n✨ Aucune installation existante détectée")
        print(f"   Procédez à une installation fraîche")


if __name__ == '__main__':
    main()