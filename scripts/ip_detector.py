#!/usr/bin/env python3
"""
LLMUI Core v0.5.0 - IP Detection Module
Détecte automatiquement les adresses IP du serveur
Author: François Chalut | contact@llmui.org
"""

import socket
import subprocess
import re
from typing import Dict, List, Optional


class IPDetector:
    """Détecte et gère les adresses IP du système"""
    
    def __init__(self):
        self.interfaces = {}
        self.detect_all()
    
    def get_local_ip(self) -> str:
        """Obtient l'IP locale principale (non-loopback)"""
        try:
            # Méthode 1: Via connexion socket (la plus fiable)
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.settimeout(0.1)
            try:
                # Connecte à une IP externe (pas besoin de vraie connexion)
                s.connect(('8.8.8.8', 80))
                ip = s.getsockname()[0]
            finally:
                s.close()
            return ip
        except Exception:
            # Méthode 2: Via hostname
            try:
                return socket.gethostbyname(socket.gethostname())
            except Exception:
                return '127.0.0.1'
    
    def get_all_ips(self) -> List[str]:
        """Obtient toutes les IPs actives (IPv4)"""
        ips = []
        
        try:
            # Utilise 'ip' command (Linux)
            result = subprocess.run(
                ['ip', '-4', 'addr', 'show'],
                capture_output=True,
                text=True,
                timeout=2
            )
            
            # Parse les IPs
            for line in result.stdout.split('\n'):
                match = re.search(r'inet\s+(\d+\.\d+\.\d+\.\d+)', line)
                if match:
                    ip = match.group(1)
                    if ip != '127.0.0.1':  # Skip loopback
                        ips.append(ip)
        
        except Exception:
            # Fallback: juste l'IP principale
            local_ip = self.get_local_ip()
            if local_ip != '127.0.0.1':
                ips.append(local_ip)
        
        return list(set(ips))  # Remove duplicates
    
    def get_interface_details(self) -> Dict[str, Dict]:
        """Obtient les détails de toutes les interfaces réseau"""
        interfaces = {}
        
        try:
            result = subprocess.run(
                ['ip', '-4', '-o', 'addr', 'show'],
                capture_output=True,
                text=True,
                timeout=2
            )
            
            for line in result.stdout.strip().split('\n'):
                if not line:
                    continue
                
                # Parse: "2: eth0    inet 192.168.1.100/24 ..."
                parts = line.split()
                if len(parts) >= 4:
                    interface = parts[1].rstrip(':')
                    ip_cidr = parts[3]
                    ip = ip_cidr.split('/')[0]
                    
                    if ip != '127.0.0.1':
                        # Détermine le type d'interface
                        if_type = self._get_interface_type(interface)
                        
                        interfaces[interface] = {
                            'ip': ip,
                            'cidr': ip_cidr,
                            'type': if_type,
                            'is_wifi': 'wl' in interface.lower(),
                            'is_ethernet': 'eth' in interface.lower() or 'en' in interface.lower()
                        }
        
        except Exception:
            # Fallback: juste l'IP principale
            local_ip = self.get_local_ip()
            if local_ip != '127.0.0.1':
                interfaces['primary'] = {
                    'ip': local_ip,
                    'cidr': f'{local_ip}/24',
                    'type': 'unknown',
                    'is_wifi': False,
                    'is_ethernet': False
                }
        
        return interfaces
    
    def _get_interface_type(self, interface: str) -> str:
        """Détermine le type d'interface"""
        interface_lower = interface.lower()
        
        if 'lo' in interface_lower:
            return 'loopback'
        elif 'wl' in interface_lower:
            return 'wifi'
        elif 'eth' in interface_lower or 'en' in interface_lower:
            return 'ethernet'
        elif 'docker' in interface_lower or 'br' in interface_lower:
            return 'virtual'
        else:
            return 'unknown'
    
    def detect_all(self):
        """Détecte toutes les informations réseau"""
        self.interfaces = self.get_interface_details()
    
    def get_primary_ip(self) -> str:
        """Retourne l'IP principale (préfère ethernet > wifi > autre)"""
        # Trie par priorité
        priorities = {'ethernet': 3, 'wifi': 2, 'unknown': 1, 'virtual': 0}
        
        best_interface = None
        best_priority = -1
        
        for name, details in self.interfaces.items():
            priority = priorities.get(details['type'], 0)
            if priority > best_priority:
                best_priority = priority
                best_interface = details
        
        if best_interface:
            return best_interface['ip']
        else:
            return self.get_local_ip()
    
    def get_access_urls(self, port: int = 9000) -> Dict[str, str]:
        """Génère les URLs d'accès pour un port donné"""
        urls = {
            'localhost': f'http://localhost:{port}',
            'loopback': f'http://127.0.0.1:{port}'
        }
        
        primary_ip = self.get_primary_ip()
        if primary_ip and primary_ip != '127.0.0.1':
            urls['primary'] = f'http://{primary_ip}:{port}'
        
        # Ajoute toutes les autres IPs
        all_ips = self.get_all_ips()
        for ip in all_ips:
            if ip != primary_ip:
                urls[f'network_{ip}'] = f'http://{ip}:{port}'
        
        return urls
    
    def print_summary(self, port: int = 9000):
        """Affiche un résumé des informations réseau"""
        print("\n" + "=" * 70)
        print(" 🌐 Réseau - Informations de connexion")
        print("=" * 70)
        
        urls = self.get_access_urls(port)
        
        print("\n📍 URLs d'accès :")
        print(f"   Local:    {urls['localhost']}")
        
        if 'primary' in urls:
            primary_ip = self.get_primary_ip()
            interface_type = 'ethernet' if any(
                d['is_ethernet'] for d in self.interfaces.values()
            ) else 'wifi'
            print(f"   Réseau:   {urls['primary']} ({interface_type})")
        
        other_ips = [url for key, url in urls.items() 
                     if key.startswith('network_')]
        if other_ips:
            print(f"\n📱 Autres interfaces :")
            for url in other_ips:
                print(f"   {url}")
        
        print("\n🔧 Interfaces réseau actives :")
        for name, details in self.interfaces.items():
            icon = '📶' if details['is_wifi'] else '🔌' if details['is_ethernet'] else '💻'
            print(f"   {icon} {name:12s} {details['ip']:15s} ({details['type']})")
        
        print("\n" + "=" * 70)


def main():
    """Test du module"""
    detector = IPDetector()
    detector.print_summary(9000)
    
    print("\n📊 Données brutes :")
    print(f"   IP principale: {detector.get_primary_ip()}")
    print(f"   Toutes les IPs: {detector.get_all_ips()}")
    print(f"   URLs: {detector.get_access_urls()}")


if __name__ == '__main__':
    main()
