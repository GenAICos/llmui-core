# stats_module.py
# Module pour gérer les statistiques réelles de LLMUI Core
# Utilise SQLite pour stocker les données
# Auteur: Francois Chalut
# Version: 0.5.0
# Date: Novembre 2025

import sqlite3
import datetime
import os

class StatsModule:
    def __init__(self, db_path='llmui_stats.db'):
        """
        Initialise le module de stats avec la base SQLite.
        Crée la DB et les tables si elles n'existent pas.
        """
        self.db_path = db_path
        self.conn = sqlite3.connect(self.db_path)
        self.cursor = self.conn.cursor()
        self.create_tables()

    def create_tables(self):
        """
        Crée les tables nécessaires si elles n'existent pas.
        - conversations: pour tracker les sessions
        - messages: pour tracker les messages individuels
        """
        # Table conversations
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                start_time DATETIME,
                end_time DATETIME,
                total_messages INTEGER DEFAULT 0,
                success INTEGER DEFAULT 1  -- 1 pour succès, 0 pour échec
            )
        ''')

        # Table messages
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT,
                timestamp DATETIME,
                type TEXT,  -- 'user' ou 'assistant'
                response_time REAL DEFAULT 0.0,  -- temps de réponse en secondes pour assistant
                success INTEGER DEFAULT 1,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id)
            )
        ''')

        self.conn.commit()

    def start_conversation(self, session_id):
        """
        Démarre une nouvelle conversation.
        """
        now = datetime.datetime.now()
        self.cursor.execute('''
            INSERT OR REPLACE INTO conversations (id, start_time)
            VALUES (?, ?)
        ''', (session_id, now))
        self.conn.commit()

    def end_conversation(self, session_id):
        """
        Termine une conversation et met à jour le end_time.
        """
        now = datetime.datetime.now()
        self.cursor.execute('''
            UPDATE conversations
            SET end_time = ?
            WHERE id = ?
        ''', (now, session_id))
        self.conn.commit()

    def log_message(self, session_id, msg_type, response_time=0.0, success=1):
        """
        Log un message (user ou assistant).
        - msg_type: 'user' ou 'assistant'
        - response_time: pour assistant seulement
        - success: 1 si succès, 0 si échec
        """
        now = datetime.datetime.now()
        self.cursor.execute('''
            INSERT INTO messages (conversation_id, timestamp, type, response_time, success)
            VALUES (?, ?, ?, ?, ?)
        ''', (session_id, now, msg_type, response_time, success))
        
        # Mise à jour du total_messages dans conversations
        self.cursor.execute('''
            UPDATE conversations
            SET total_messages = total_messages + 1,
                success = ?  -- Met à 0 si un message a échoué
            WHERE id = ? AND success = 1
        ''', (success, session_id))
        
        self.conn.commit()

    def get_stats(self):
        """
        Récupère les stats agrégées pour l'API /api/stats.
        Retourne un dict avec:
        - total_conversations
        - total_messages
        - avg_generation_time (moyenne des response_time pour assistant)
        - success_rate (pourcentage de conversations réussies)
        """
        # Total conversations
        self.cursor.execute('SELECT COUNT(*) FROM conversations')
        total_conversations = self.cursor.fetchone()[0]

        # Total messages
        self.cursor.execute('SELECT COUNT(*) FROM messages')
        total_messages = self.cursor.fetchone()[0]

        # Avg response time (seulement pour assistant)
        self.cursor.execute('''
            SELECT AVG(response_time) FROM messages WHERE type = 'assistant' AND response_time > 0
        ''')
        avg_generation_time = self.cursor.fetchone()[0] or 0.0

        # Success rate (pourcentage de conversations avec success=1)
        self.cursor.execute('SELECT COUNT(*) FROM conversations WHERE success = 1')
        successful_convs = self.cursor.fetchone()[0]
        success_rate = (successful_convs / total_conversations * 100) if total_conversations > 0 else 0.0

        return {
            'total_conversations': total_conversations,
            'total_messages': total_messages,
            'avg_generation_time': avg_generation_time,
            'success_rate': success_rate
        }

    def close(self):
        """
        Ferme la connexion à la DB.
        """
        self.conn.close()

# Exemple d'utilisation (intégrez dans votre backend, ex: anima_collective.py)
if __name__ == "__main__":
    stats = StatsModule()

    # Exemple: Démarrer une session
    session_id = "test_session_123"
    stats.start_conversation(session_id)

    # Log messages
    stats.log_message(session_id, 'user')
    stats.log_message(session_id, 'assistant', response_time=2.5, success=1)
    stats.log_message(session_id, 'user')
    stats.log_message(session_id, 'assistant', response_time=3.0, success=0)  # Échec

    # Terminer session
    stats.end_conversation(session_id)

    # Récup stats
    print(stats.get_stats())

    stats.close()
