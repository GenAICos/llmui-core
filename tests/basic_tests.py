#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tests unitaires pour le système de mémoire hybride
Author: François Chalut
"""

import pytest
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from memory import HybridMemorySystem


class TestHybridMemorySystem:
    """Tests pour HybridMemorySystem"""
    
    def setup_method(self):
        """Setup avant chaque test"""
        self.memory = HybridMemorySystem(
            max_recent_messages=5,
            max_summary_messages=10,
            compression_threshold=10,
            max_context_tokens=3000
        )
        self.session_id = "test_session_123"
    
    def test_add_message_creates_session(self):
        """Test: Ajout d'un message crée une session"""
        self.memory.add_message(
            session_id=self.session_id,
            role="user",
            content="Hello, how are you?"
        )
        
        assert self.session_id in self.memory.conversations
        assert len(self.memory.conversations[self.session_id]["recent_messages"]) == 1
    
    def test_add_multiple_messages(self):
        """Test: Ajout de plusieurs messages"""
        for i in range(3):
            self.memory.add_message(
                session_id=self.session_id,
                role="user" if i % 2 == 0 else "assistant",
                content=f"Message {i}"
            )
        
        assert len(self.memory.conversations[self.session_id]["recent_messages"]) == 3
        assert self.memory.conversations[self.session_id]["session_metadata"]["total_messages"] == 3
    
    def test_get_context_empty_session(self):
        """Test: Contexte vide pour session inexistante"""
        context = self.memory.get_context("nonexistent_session")
        assert context == ""
    
    def test_get_context_with_messages(self):
        """Test: Récupération du contexte avec messages"""
        self.memory.add_message(self.session_id, "user", "What is Python?")
        self.memory.add_message(self.session_id, "assistant", "Python is a programming language.")
        
        context = self.memory.get_context(self.session_id)
        
        assert "Python" in context
        assert "Recent Messages" in context
    
    def test_compression_threshold(self):
        """Test: Compression après dépassement du seuil"""
        # Ajouter 12 messages (seuil = 10)
        for i in range(12):
            self.memory.add_message(
                session_id=self.session_id,
                role="user" if i % 2 == 0 else "assistant",
                content=f"Message number {i} with some content"
            )
        
        conv = self.memory.conversations[self.session_id]
        
        # Devrait avoir max 5 messages récents
        assert len(conv["recent_messages"]) <= self.memory.max_recent_messages
        
        # Devrait avoir des messages compressés
        assert len(conv["summarized_messages"]) > 0
    
    def test_clear_session(self):
        """Test: Suppression d'une session"""
        self.memory.add_message(self.session_id, "user", "Test message")
        assert self.session_id in self.memory.conversations
        
        self.memory.clear_session(self.session_id)
        assert self.session_id not in self.memory.conversations
    
    def test_session_analytics(self):
        """Test: Analytics de session"""
        self.memory.add_message(self.session_id, "user", "Question?")
        self.memory.add_message(self.session_id, "assistant", "Answer.")
        
        analytics = self.memory.get_session_analytics(self.session_id)
        
        assert analytics["session_id"] == self.session_id
        assert analytics["recent_message_count"] == 2
        assert analytics["user_questions"] >= 1
    
    def test_importance_calculation(self):
        """Test: Calcul de l'importance"""
        # Message court et simple
        low_importance = self.memory._calculate_importance("Hi", "user")
        
        # Question longue avec mots-clés importants
        high_importance = self.memory._calculate_importance(
            "How do I solve this critical error in my Python code?",
            "user"
        )
        
        assert low_importance < high_importance
        assert 0.0 <= low_importance <= 1.0
        assert 0.0 <= high_importance <= 1.0
    
    def test_keyword_extraction(self):
        """Test: Extraction de mots-clés"""
        content = "I want to learn about quantum computing and machine learning"
        keywords = self.memory._extract_keywords(content)
        
        assert "quantum" in keywords
        assert "computing" in keywords or "machine" in keywords
        # Stop words supprimés
        assert "the" not in keywords
        assert "to" not in keywords
    
    def test_export_import_session(self):
        """Test: Export/Import de session"""
        # Ajouter des messages
        self.memory.add_message(self.session_id, "user", "Test 1")
        self.memory.add_message(self.session_id, "assistant", "Response 1")
        
        # Exporter
        exported = self.memory.export_session(self.session_id)
        
        assert "recent_messages" in exported
        assert "session_metadata" in exported
        
        # Importer dans nouvelle session
        new_session_id = "imported_session"
        self.memory.import_session(new_session_id, exported)
        
        assert new_session_id in self.memory.conversations
        assert len(self.memory.conversations[new_session_id]["recent_messages"]) == 2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
