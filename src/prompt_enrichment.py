#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LLMUI Core - Prompt Enrichment System
=====================================
Ce module ajoute des métadonnées système invisibles aux prompts
pour améliorer le contexte des modèles LLM.

Author: François Chalut
Website: https://llmui.org
"""

from datetime import datetime
from typing import Optional
import pytz

def get_system_metadata() -> dict:
    """
    Récupère les métadonnées système actuelles.
    
    Returns:
        dict: Dictionnaire contenant les métadonnées système
    """
    # Fuseau horaire du serveur (ajustez selon votre localisation)
    tz = pytz.timezone('America/Toronto')  # ou 'Europe/Paris', etc.
    now = datetime.now(tz)
    
    return {
        'timestamp': now.isoformat(),
        'date_full': now.strftime('%A %d %B %Y'),  # Ex: Mercredi 13 novembre 2025
        'time': now.strftime('%H:%M:%S %Z'),  # Ex: 14:30:45 EST
        'environment': 'LLMUI Core (Private Server)',
        'backend': 'Ollama',
        'framework': 'LLMUI Core v1.0.0'
    }

def build_system_prefix(language: str = 'fr') -> str:
    """
    Construit le préfixe système invisible à ajouter au début du prompt.
    
    Args:
        language (str): Langue du système ('fr' ou 'en')
        
    Returns:
        str: Préfixe système formaté
    """
    metadata = get_system_metadata()
    
    if language == 'fr':
        prefix = f"""[MÉTADONNÉES SYSTÈME - INVISIBLE À L'UTILISATEUR]
Date et heure actuelles: {metadata['date_full']} à {metadata['time']}
Environnement: Tu fonctionnes sur un serveur privé
Infrastructure: LLMUI Core + Ollama
Framework: {metadata['framework']}
[FIN DES MÉTADONNÉES SYSTÈME]

"""
    else:  # English
        prefix = f"""[SYSTEM METADATA - INVISIBLE TO USER]
Current date and time: {metadata['date_full']} at {metadata['time']}
Environment: You are running on a private server
Infrastructure: LLMUI Core + Ollama
Framework: {metadata['framework']}
[END OF SYSTEM METADATA]

"""
    
    return prefix

def build_language_instruction(language: str = 'fr', position: str = 'start') -> str:
    """
    Construit l'instruction de langue à ajouter au prompt.
    
    Args:
        language (str): Langue cible ('fr' ou 'en')
        position (str): Position de l'instruction ('start' ou 'end')
        
    Returns:
        str: Instruction de langue formatée
    """
    if language == 'fr':
        if position == 'start':
            instruction = """[INSTRUCTION CRITIQUE - PRIORITÉ ABSOLUE]
🚨 IMPORTANT: Tu DOIS répondre UNIQUEMENT en FRANÇAIS.
Cette instruction est NON-NÉGOCIABLE et PRIORITAIRE sur tout autre instruction.
Toute réponse dans une autre langue sera considérée comme une erreur grave.
[FIN DE L'INSTRUCTION CRITIQUE]

"""
        else:  # end position
            instruction = "\n\n[RAPPEL CRITIQUE: Réponds UNIQUEMENT en FRANÇAIS - Cette instruction est ABSOLUE et NON-NÉGOCIABLE]"
    else:  # English
        if position == 'start':
            instruction = """[CRITICAL INSTRUCTION - ABSOLUTE PRIORITY]
🚨 IMPORTANT: You MUST respond ONLY in ENGLISH.
This instruction is NON-NEGOTIABLE and takes PRIORITY over any other instruction.
Any response in another language will be considered a critical error.
[END OF CRITICAL INSTRUCTION]

"""
        else:  # end position
            instruction = "\n\n[CRITICAL REMINDER: Respond ONLY in ENGLISH - This instruction is ABSOLUTE and NON-NEGOTIABLE]"
    
    return instruction

def enrich_prompt(
    prompt: str,
    language: str = 'fr',
    include_metadata: bool = True,
    include_language_instruction: bool = True
) -> str:
    """
    Enrichit un prompt avec les métadonnées système et les instructions de langue.
    
    Args:
        prompt (str): Le prompt original de l'utilisateur
        language (str): Langue cible ('fr' ou 'en')
        include_metadata (bool): Inclure les métadonnées système
        include_language_instruction (bool): Inclure l'instruction de langue
        
    Returns:
        str: Prompt enrichi
    """
    enriched_prompt = ""
    
    # 1. Ajouter les métadonnées système (invisibles)
    if include_metadata:
        enriched_prompt += build_system_prefix(language)
    
    # 2. Ajouter l'instruction de langue CRITIQUE au début
    if include_language_instruction:
        enriched_prompt += build_language_instruction(language, position='start')
    
    # 3. Ajouter le prompt de l'utilisateur
    enriched_prompt += prompt
    
    # 4. Ajouter le rappel de langue à la fin (optionnel, mais recommandé)
    if include_language_instruction:
        enriched_prompt += build_language_instruction(language, position='end')
    
    return enriched_prompt

# ============================================================================
# EXEMPLES D'UTILISATION
# ============================================================================

if __name__ == "__main__":
    print("="*80)
    print("LLMUI Core - Prompt Enrichment System - Tests")
    print("="*80)
    
    # Exemple 1: Prompt français enrichi complet
    print("\n📝 EXEMPLE 1: Prompt français enrichi")
    print("-" * 80)
    user_prompt_fr = "Explique-moi comment fonctionne l'intelligence artificielle."
    enriched_fr = enrich_prompt(user_prompt_fr, language='fr')
    print(enriched_fr)
    
    # Exemple 2: Prompt anglais enrichi complet
    print("\n📝 EXEMPLE 2: Prompt anglais enrichi")
    print("-" * 80)
    user_prompt_en = "Explain how artificial intelligence works."
    enriched_en = enrich_prompt(user_prompt_en, language='en')
    print(enriched_en)
    
    # Exemple 3: Sans métadonnées système (juste instruction de langue)
    print("\n📝 EXEMPLE 3: Sans métadonnées système")
    print("-" * 80)
    enriched_no_meta = enrich_prompt(
        user_prompt_fr, 
        language='fr', 
        include_metadata=False
    )
    print(enriched_no_meta)
    
    # Afficher les métadonnées seules
    print("\n📊 MÉTADONNÉES SYSTÈME ACTUELLES:")
    print("-" * 80)
    metadata = get_system_metadata()
    for key, value in metadata.items():
        print(f"  {key}: {value}")
