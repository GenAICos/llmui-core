#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
memory.py - Hybrid Memory System for LLMUI Core
Intelligent conversation context management with persistence

FEATURES:
- Session-based conversation memory
- Automatic context compression for long conversations
- Importance scoring for message retention
- Keyword extraction for topic tracking
- Export/import functionality

HOW IT WORKS:
1. Recent messages (last 5-10) kept in full
2. Older messages summarized and compressed
3. Important messages preserved longer
4. Context automatically injected into prompts

Author: François Chalut
Website: https://llmui.org
Version: 2.0.0
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
import re
from typing import Dict, List, Optional
import json

# ============================================================================
# DATA STRUCTURES
# ============================================================================

@dataclass
class MessageSummary:
    """
    Compressed message summary for memory efficiency.
    
    Used when messages are too old to keep in full but still valuable.
    
    Attributes:
        role: 'user' or 'assistant'
        summary: Shortened version of original message (max 100 chars)
        keywords: Important words for context search
        importance_score: 0.0-1.0, determines retention priority
        timestamp: When message was created (ISO format)
    """
    role: str
    summary: str
    keywords: List[str]
    importance_score: float
    timestamp: str

# ============================================================================
# HYBRID MEMORY SYSTEM
# ============================================================================

class HybridMemorySystem:
    """
    Hybrid memory management for conversational context.
    
    MEMORY ARCHITECTURE:
    
    ┌─────────────────────────────────────┐
    │  Recent Messages (Full Text)        │  Last 5 messages
    │  - User: "What is Python?"          │  Always preserved
    │  - Assistant: "Python is..."        │
    ├─────────────────────────────────────┤
    │  Summarized Messages (Compressed)   │  Next 10 messages
    │  - User: "Python question..."       │  Summaries only
    │  - Assistant: "Explained Python..." │
    ├─────────────────────────────────────┤
    │  Discarded Messages                 │  Older messages
    │  - Low importance messages removed  │  Not in context
    └─────────────────────────────────────┘
    
    CONFIGURATION GUIDE:
    
    max_recent_messages (default: 5):
        - Increase (7-10) for: Long detailed conversations
        - Decrease (3) for: Many concurrent users, RAM limits
    
    max_summary_messages (default: 10):
        - Increase (15-20) for: Complex multi-topic conversations
        - Decrease (5) for: Simple Q&A, memory constraints
    
    compression_threshold (default: 10):
        - When total messages exceed this, start compressing
        - Lower (5) = compress sooner, less memory
        - Higher (15) = keep more full messages, more memory
    
    max_context_tokens (default: 3000):
        - Approximate token limit for context injection
        - Adjust based on your Ollama model's context window
        - Claude: 8000+, GPT-4: 8000+, smaller models: 2000-4000
    """
    
    def __init__(
        self,
        max_recent_messages: int = 5,
        max_summary_messages: int = 10,
        compression_threshold: int = 10,
        max_context_tokens: int = 3000
    ):
        """
        Initialize hybrid memory system.
        
        Args:
            max_recent_messages: Number of messages to keep in full
            max_summary_messages: Number of older messages to summarize
            compression_threshold: When to start compressing
            max_context_tokens: Max tokens in context (estimated)
        """
        # Store all active conversations
        # Key: session_id, Value: conversation data
        self.conversations: Dict[str, Dict] = {}
        
        # Configuration
        self.max_recent_messages = max_recent_messages
        self.max_summary_messages = max_summary_messages
        self.compression_threshold = compression_threshold
        self.max_context_tokens = max_context_tokens
        
    def add_message(
        self, 
        session_id: str, 
        role: str, 
        content: str, 
        metadata: Optional[Dict] = None
    ):
        """
        Add a message to conversation history.
        
        IMPORTANT: This method automatically:
        1. Creates new session if needed
        2. Tracks message importance
        3. Extracts keywords
        4. Compresses old messages when threshold reached
        
        Args:
            session_id: Unique session identifier
            role: 'user' or 'assistant'
            content: Message text
            metadata: Optional additional data (e.g., model name, time)
            
        Example:
            memory.add_message(
                session_id="abc123",
                role="user",
                content="What is quantum computing?",
                metadata={"model": "qwen2.5:8b"}
            )
        """
        # Create session if it doesn't exist
        if session_id not in self.conversations:
            self._create_session(session_id)
        
        conv = self.conversations[session_id]
        
        # Calculate importance (0.0 to 1.0)
        # Higher score = more likely to be preserved
        importance = self._calculate_importance(content, role)
        
        # Extract keywords for topic tracking
        keywords = self._extract_keywords(content)
        
        # Build message object
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat(),
            "importance": importance,
            "keywords": keywords,
            "metadata": metadata or {}
        }
        
        # Add to recent messages
        conv["recent_messages"].append(message)
        
        # Update session metadata
        conv["session_metadata"]["total_messages"] += 1
        conv["session_metadata"]["topics"].update(keywords)
        conv["session_metadata"]["last_activity"] = datetime.now().isoformat()
        
        # Compress old messages if threshold reached
        if len(conv["recent_messages"]) > self.compression_threshold:
            self._compress_old_messages(session_id)
    
    def _create_session(self, session_id: str):
        """
        Create a new conversation session.
        
        Session Structure:
        {
            "recent_messages": [],        # Full messages
            "summarized_messages": [],    # Compressed messages
            "session_metadata": {
                "created": "2025-01-18T12:00:00",
                "total_messages": 0,
                "topics": set(),          # All keywords seen
                "last_activity": "2025-01-18T12:00:00"
            }
        }
        """
        self.conversations[session_id] = {
            "recent_messages": [],
            "summarized_messages": [],
            "session_metadata": {
                "created": datetime.now().isoformat(),
                "total_messages": 0,
                "topics": set(),
                "last_activity": datetime.now().isoformat()
            }
        }
    
    def _calculate_importance(self, content: str, role: str) -> float:
        """
        Calculate importance score for message retention.
        
        SCORING FACTORS:
        - Base score: 0.5
        - User messages: +0.1 (questions are important)
        - Long messages: +0.1 (detailed info)
        - Short messages: -0.1 (less context)
        - Important keywords: +0.1 (help, error, explain, etc.)
        - Questions (?): +0.15 (answers needed)
        - Code blocks: +0.1 (technical content)
        
        Returns:
            Score from 0.0 to 1.0
            
        Examples:
            "Hi" -> 0.4 (short, no special features)
            "How does quantum computing work?" -> 0.85 (question, important keyword)
            "Here's the code: ```python...```" -> 0.8 (code block, long)
        """
        score = 0.5  # Base score
        
        # User messages slightly more important (questions drive conversation)
        if role == "user":
            score += 0.1
        
        # Length factor
        content_length = len(content)
        if content_length > 200:
            score += 0.1  # Long messages have more context
        elif content_length < 50:
            score -= 0.1  # Short messages less valuable
        
        # Important keywords (help, explain, etc.)
        important_keywords = [
            "important", "urgent", "problem", "error", "bug", "critical",
            "how", "why", "explain", "define", "what", "when", "where",
            "solve", "solution", "help", "need", "fix", "issue"
        ]
        if any(keyword.lower() in content.lower() for keyword in important_keywords):
            score += 0.1
        
        # Questions are important (need answers)
        if "?" in content or content.lower().startswith(("how", "why", "what", "where", "when")):
            score += 0.15
        
        # Code blocks are important (technical context)
        if "```" in content or content.count("`") > 2:
            score += 0.1
        
        # Clamp to [0.0, 1.0]
        return min(1.0, max(0.0, score))
    
    def _extract_keywords(self, content: str) -> List[str]:
        """
        Extract important keywords from message text.
        
        PROCESS:
        1. Remove punctuation
        2. Convert to lowercase
        3. Split into words
        4. Filter out stop words (the, a, is, etc.)
        5. Keep words > 3 characters
        6. Return top 5 keywords
        
        STOP WORDS (removed):
        - English: the, a, an, is, are, and, or, etc.
        - French: le, la, les, un, une, est, sont, etc.
        
        Args:
            content: Message text
            
        Returns:
            List of up to 5 keywords
            
        Examples:
            "What is quantum computing?" -> ["quantum", "computing"]
            "Explain machine learning algorithms" -> ["explain", "machine", "learning", "algorithms"]
        """
        # Remove punctuation and lowercase
        text = re.sub(r'[^\w\s]', ' ', content.lower())
        words = text.split()
        
        # Stop words (common words with low information value)
        stop_words = {
            # English
            "the", "a", "an", "and", "or", "is", "are", "was", "were",
            "in", "on", "at", "to", "for", "of", "with", "by", "from",
            "as", "that", "this", "these", "those", "it", "its",
            # French
            "le", "la", "les", "un", "une", "des", "de", "du", "et",
            "ou", "est", "sont", "a", "au", "aux", "ce", "cette", "ces",
            "dans", "pour", "avec", "sur", "par", "je", "tu", "il",
            "elle", "nous", "vous", "ils", "elles", "mon", "ma", "mes"
        }
        
        # Filter: words > 3 chars AND not stop words
        keywords = [
            word for word in words 
            if len(word) > 3 and word not in stop_words
        ]
        
        # Return top 5 (most likely to be meaningful)
        return keywords[:5]
    
    def _compress_old_messages(self, session_id: str):
        """
        Compress oldest messages to save memory.
        
        COMPRESSION STRATEGY:
        1. Keep last N messages in full (max_recent_messages)
        2. Compress older messages to summaries
        3. Only keep important compressed messages (score > 0.6)
        4. Limit total compressed messages (max_summary_messages)
        
        This creates a sliding window:
        - Recent: Full detail
        - Middle: Summaries
        - Old: Discarded (unless very important)
        """
        conv = self.conversations[session_id]
        recent = conv["recent_messages"]
        
        # Messages to compress (oldest ones)
        messages_to_compress = recent[:-self.max_recent_messages]
        
        # Keep only recent messages in full
        conv["recent_messages"] = recent[-self.max_recent_messages:]
        
        # Compress and filter by importance
        for msg in messages_to_compress:
            # Only preserve important messages in summary
            if msg["importance"] > 0.6:
                summary = self._create_message_summary(msg)
                conv["summarized_messages"].append(summary)
        
        # Limit number of summaries (keep most important)
        if len(conv["summarized_messages"]) > self.max_summary_messages:
            # Sort by importance (highest first)
            conv["summarized_messages"].sort(
                key=lambda x: x.importance_score, 
                reverse=True
            )
            # Keep top N
            conv["summarized_messages"] = conv["summarized_messages"][:self.max_summary_messages]
    
    def _create_message_summary(self, message: Dict) -> MessageSummary:
        """
        Create a compressed summary from a full message.
        
        COMPRESSION TECHNIQUE:
        - Short messages (≤100 chars): Keep as-is
        - Long messages: First 50 chars + [...] + last 30 chars
        
        This preserves the beginning (context) and end (conclusion)
        while removing the middle (details).
        
        Args:
            message: Full message dict
            
        Returns:
            MessageSummary object (compressed)
            
        Examples:
            Short: "What is Python?" -> "What is Python?"
            Long: "Python is a high-level programming language created by Guido van Rossum. It emphasizes code readability and simplicity. Python is widely used in web development, data science, AI, automation, and more."
            -> "Python is a high-level programming language [...] automation, and more."
        """
        content = message["content"]
        
        # Create short summary
        if len(content) <= 100:
            summary = content
        else:
            # Keep beginning and end
            summary = content[:50] + " [...] " + content[-30:]
        
        return MessageSummary(
            role=message["role"],
            summary=summary,
            keywords=message["keywords"],
            importance_score=message["importance"],
            timestamp=message["timestamp"]
        )
    
    def get_context(self, session_id: str, current_prompt: str = "") -> str:
        """
        Get conversation context for injection into model prompt.
        
        CONTEXT BUILDING:
        1. Session metadata (if established conversation)
        2. Summarized messages (compressed history)
        3. Recent messages (full detail)
        4. Total size limited by max_context_tokens
        
        Args:
            session_id: Session to get context for
            current_prompt: Current user query (optional, for relevance)
            
        Returns:
            Formatted context string ready for model injection
            
        Example Output:
            ```
            === Conversation Context ===
            Active session since: 2025-01-18
            Messages exchanged: 15
            Topics discussed: python, programming, flask
            
            === Summary History ===
            User: Asked about Python basics [...]
            Assistant: Explained Python fundamentals [...]
            
            === Recent Messages ===
            User: How do I install Flask?
            Assistant: You can install Flask using pip install flask
            User: Can you explain routing?
            
            === End Context ===
            ```
        """
        if session_id not in self.conversations:
            return ""  # No context for new session
        
        conv = self.conversations[session_id]
        context_parts = []
        
        # Add session metadata (if conversation is established)
        metadata = conv["session_metadata"]
        if metadata["total_messages"] > 5:
            topics_list = list(metadata["topics"])[:5]  # Top 5 topics
            context_parts.append(
                f"=== Conversation Context ===\n"
                f"Active session since: {metadata['created'][:10]}\n"
                f"Messages exchanged: {metadata['total_messages']}\n"
                f"Topics discussed: {', '.join(topics_list)}\n"
            )
        
        # Add summarized messages (compressed history)
        if conv["summarized_messages"]:
            context_parts.append("=== Summary History ===")
            # Show last 3 summaries
            for summary in conv["summarized_messages"][-3:]:
                role_label = "User" if summary.role == "user" else "Assistant"
                context_parts.append(f"{role_label}: {summary.summary}")
        
        # Add recent messages (full detail)
        if conv["recent_messages"]:
            context_parts.append("=== Recent Messages ===")
            for msg in conv["recent_messages"]:
                role_label = "User" if msg["role"] == "user" else "Assistant"
                # Truncate very long messages
                content = msg["content"][:150] + "..." if len(msg["content"]) > 150 else msg["content"]
                context_parts.append(f"{role_label}: {content}")
        
        context_parts.append("=== End Context ===\n")
        
        # Join all parts
        full_context = "\n".join(context_parts)
        
        # If context too long, trim it
        # Rough estimate: 1 token ≈ 4 characters
        estimated_tokens = len(full_context) // 4
        
        if estimated_tokens > self.max_context_tokens:
            # Simplified context: only recent messages
            context_parts = []
            
            # Keep metadata if present
            if metadata["total_messages"] > 5:
                topics_list = list(metadata["topics"])[:5]
                context_parts.append(
                    f"=== Conversation Context ===\n"
                    f"Messages: {metadata['total_messages']}\n"
                    f"Topics: {', '.join(topics_list)}\n"
                )
            
            # Only recent messages
            context_parts.append("=== Recent Messages ===")
            for msg in conv["recent_messages"][-3:]:  # Last 3 only
                role_label = "User" if msg["role"] == "user" else "Assistant"
                content = msg["content"][:100] + "..." if len(msg["content"]) > 100 else msg["content"]
                context_parts.append(f"{role_label}: {content}")
            
            context_parts.append("=== End Context ===\n")
            full_context = "\n".join(context_parts)
        
        return full_context
    
    def clear_session(self, session_id: str):
        """
        Clear a specific session (delete all history).
        
        Use when:
        - User clicks "New Conversation"
        - Session expires
        - User requests history deletion
        
        Args:
            session_id: Session to clear
        """
        if session_id in self.conversations:
            del self.conversations[session_id]
    
    def get_session_analytics(self, session_id: str) -> Dict:
        """
        Get detailed analytics for a session.
        
        Returns:
            Dictionary with:
            - Basic info (id, created, messages)
            - Message counts (recent, summarized)
            - Statistics (avg length, questions)
            - Top keywords
            - Activity level
            
        Useful for:
        - Debugging
        - User statistics
        - Session health monitoring
        """
        if session_id not in self.conversations:
            return {"error": "Session not found"}
        
        conv = self.conversations[session_id]
        recent_msgs = conv["recent_messages"]
        
        # Analyze messages
        all_keywords = []
        user_questions = 0
        total_chars = 0
        
        for msg in recent_msgs:
            all_keywords.extend(msg.get("keywords", []))
            if msg["role"] == "user" and "?" in msg["content"]:
                user_questions += 1
            total_chars += len(msg["content"])
        
        # Keyword frequency
        keyword_freq = {}
        for kw in all_keywords:
            keyword_freq[kw] = keyword_freq.get(kw, 0) + 1
        
        # Top keywords
        top_keywords = sorted(
            keyword_freq.items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:5]
        
        return {
            "session_id": session_id,
            "metadata": conv["session_metadata"],
            "recent_message_count": len(recent_msgs),
            "summarized_message_count": len(conv["summarized_messages"]),
            "avg_message_length": total_chars / max(len(recent_msgs), 1),
            "user_questions": user_questions,
            "top_keywords": top_keywords,
            "session_activity": self._calculate_session_activity(recent_msgs)
        }
    
    def _calculate_session_activity(self, messages: List[Dict]) -> str:
        """
        Calculate session activity level based on message count.
        
        Returns:
            "New" (< 3), "Moderate" (3-7), "Active" (8-14), "Very Active" (15+)
        """
        msg_count = len(messages)
        if msg_count < 3:
            return "New"
        elif msg_count < 8:
            return "Moderate"
        elif msg_count < 15:
            return "Active"
        return "Very Active"
    
    def get_all_sessions_summary(self) -> Dict:
        """
        Get summary of all active sessions.
        
        Useful for:
        - Admin dashboard
        - Session cleanup
        - Usage statistics
        
        Returns:
            {"sessions": [list of session summaries]}
        """
        return {
            "sessions": [
                {
                    "session_id": sid,
                    "created": conv["session_metadata"]["created"],
                    "total_messages": conv["session_metadata"]["total_messages"],
                    "last_activity": conv["session_metadata"]["last_activity"]
                }
                for sid, conv in self.conversations.items()
            ]
        }
    
    def export_session(self, session_id: str) -> Dict:
        """
        Export complete session data (for backup/analysis).
        
        Returns:
            Complete conversation dict or error
        """
        if session_id not in self.conversations:
            return {"error": "Session not found"}
        
        # Convert set to list for JSON serialization
        conv_copy = dict(self.conversations[session_id])
        conv_copy["session_metadata"]["topics"] = list(
            conv_copy["session_metadata"]["topics"]
        )
        
        return conv_copy
    
    def import_session(self, session_id: str, session_data: Dict):
        """
        Import a previously exported session.
        
        Args:
            session_id: ID for the imported session
            session_data: Data from export_session()
        """
        # Convert topics list back to set
        session_data["session_metadata"]["topics"] = set(
            session_data["session_metadata"]["topics"]
        )
        
        self.conversations[session_id] = session_data