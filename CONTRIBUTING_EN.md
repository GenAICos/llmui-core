# Contributing Guide - LLMUI Core v0.5.0

Thank you for your interest in contributing to LLMUI Core! This document explains how to participate in the project's development.

---

## 📋 Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [How to Contribute](#how-to-contribute)
3. [Code Standards](#code-standards)
4. [Development Process](#development-process)
5. [Testing](#testing)
6. [Documentation](#documentation)
7. [Copyright](#copyright)

---

## � Code of Conduct

### Our Values

The LLMUI Core project is developed with a spirit of:
- **Mutual respect** among contributors
- **Constructive collaboration**
- **Digital sovereignty** for Quebec
- **Technical excellence**
- **Ethics** in AI

### Expected Behaviors

✅ **Do**:
- Be respectful and professional
- Provide constructive criticism
- Accept feedback openly
- Focus on what's best for the project
- Document your code clearly
- Respect the core team's decisions

❌ **Don't**:
- Use offensive language
- Publish others' private information
- Harass or discriminate
- Spam or troll
- Ignore project standards

---

## 🚀 How to Contribute

### Types of Contributions

We accept the following contributions:

1. **Bug reports** 🐛
2. **Feature suggestions** ✨
3. **Documentation improvements** 📖
4. **Code fixes** 🔧
5. **New features** 🎁
6. **Performance optimizations** ⚡
7. **Security improvements** 🔒

### Before Starting

1. **Check existing issues**
   ```bash
   # Search GitHub issues
   https://github.com/your-repo/llmui-core/issues
   ```

2. **Discuss your idea**
   - For large features, create a discussion issue first
   - Explain the problem and your proposed solution
   - Wait for team feedback

3. **Read the documentation**
   - README.md
   - INSTALL.md
   - docs/ARCHITECTURE.md
   - This file (CONTRIBUTING.md)

---

## 💻 Code Standards

### Python

#### Style

We follow **PEP 8** with some adaptations:

```python
# ✅ GOOD
def process_user_data(user_id: str, data: dict) -> dict:
    """
    Process user data.
    
    Args:
        user_id: Unique user identifier
        data: Data to process
        
    Returns:
        Processed data
    """
    if not user_id:
        raise ValueError("user_id required")
    
    processed_data = {
        "id": user_id,
        "timestamp": datetime.now(),
        "data": clean_data(data)
    }
    
    return processed_data

# ❌ BAD
def process(u,d):
    # No docstring
    if not u: raise ValueError("error")  # Complex one-liner
    return {"id":u,"data":d}  # No spaces
```

#### File Headers

**MANDATORY** on all Python files:

```python
#!/usr/bin/env python3
"""
==============================================================================
Filename - Short description
==============================================================================
Author: Francois Chalut
Date: YYYY-MM-DD
Version: X.Y.Z
License: AGPLv3 + common clause
==============================================================================
Detailed module/script description
==============================================================================
"""

import sys
import os
# ... other imports
```

#### Logging

Use the standard logging system:

```python
import logging

logger = logging.getLogger(__name__)

# Appropriate levels
logger.debug("Debug details")
logger.info("General information")
logger.warning("Warning required")
logger.error("Recoverable error")
logger.critical("Fatal error")
```

#### Type Hints

Use Python 3.8+ type hints:

```python
from typing import List, Dict, Optional, Union

def get_user_conversations(
    user_id: str,
    limit: Optional[int] = 10
) -> List[Dict[str, Union[str, int]]]:
    """Retrieve user conversations."""
    ...
```

### Shell/Bash

```bash
#!/bin/bash
# ==============================================================================
# Script name - Description
# ==============================================================================
# Author: Génie IA Centre Opérationnel Sécurité inc.
# Date: YYYY-MM-DD
# ==============================================================================

set -euo pipefail  # Strict errors

# Variables in UPPERCASE
INSTALL_DIR="/opt/llmui-core"
LOG_FILE="/var/log/llmui/install.log"

# Well-documented functions
log_info() {
    echo "[INFO] $1" | tee -a "$LOG_FILE"
}

main() {
    log_info "Starting script"
    # ...
}

main "$@"
```

### YAML

```yaml
# Configuration with comments
server:
  host: "0.0.0.0"  # Listen on all interfaces
  port: 5000       # Default port
  
  # SSL options
  ssl_enabled: false
  ssl_cert: "/path/to/cert.pem"
```

---

## 📄 Development Process

### 1. Fork and Clone

```bash
# Fork on GitHub, then:
git clone https://github.com/YOUR_USERNAME/llmui-core.git
cd llmui-core

# Add upstream
git remote add upstream https://github.com/genie-ia/llmui-core.git
```

### 2. Create a Branch

```bash
# Format: type/short-description
git checkout -b feature/consensus-voting
git checkout -b fix/memory-leak
git checkout -b docs/api-examples
```

**Branch types**:
- `feature/` - New feature
- `fix/` - Bug fix
- `docs/` - Documentation
- `refactor/` - Refactoring
- `perf/` - Optimization
- `test/` - Tests

### 3. Develop

```bash
# Keep your branch up to date
git fetch upstream
git rebase upstream/main

# Make your changes
# Commit regularly with clear messages
git add .
git commit -m "feat: add voting system for consensus"
```

### 4. Commit Format

Use **Conventional Commits** format:

```
type(scope): short description

Optional detailed description.

BREAKING CHANGE: description if applicable
Closes #123
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting (no code change)
- `refactor`: Refactoring
- `perf`: Performance optimization
- `test`: Add/modify tests
- `chore`: Maintenance (dependencies, config)

**Examples**:
```bash
git commit -m "feat(consensus): add weighted voting algorithm"
git commit -m "fix(memory): fix memory leak in RAG loader"
git commit -m "docs(api): add WebSocket endpoint examples"
git commit -m "perf(ollama): optimize batch request processing"
```

### 5. Tests

```bash
# Run tests
python -m pytest tests/

# With coverage
python -m pytest --cov=src tests/

# Specific tests
python -m pytest tests/test_consensus.py
```

### 6. Push and Pull Request

```bash
# Push your branch
git push origin feature/consensus-voting

# Create Pull Request on GitHub
# Title: Conventional commit format
# Description: Explain WHAT and WHY
```

### Pull Request Template

```markdown
## Description
[Describe your changes]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## Motivation
[Why this change is necessary]

## Testing Performed
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual tests

## Checklist
- [ ] Code follows project standards
- [ ] Documentation updated
- [ ] Tests pass
- [ ] No warnings
- [ ] Commit messages follow format
```

---

## 🧪 Tests

### Test Structure

```
tests/
├── unit/
│   ├── test_auth.py
│   ├── test_consensus.py
│   └── test_memory.py
├── integration/
│   ├── test_api.py
│   └── test_ollama.py
└── fixtures/
    └── sample_data.yaml
```

### Writing Tests

```python
import pytest
from src.consensus import ConsensusEngine

class TestConsensusEngine:
    """Tests for consensus engine."""
    
    @pytest.fixture
    def engine(self):
        """Fixture: test engine."""
        return ConsensusEngine(models=["phi3", "gemma2"])
    
    def test_vote_majority(self, engine):
        """Test simple majority voting."""
        responses = [
            {"model": "phi3", "response": "A"},
            {"model": "gemma2", "response": "A"},
        ]
        
        result = engine.vote(responses)
        assert result == "A"
    
    def test_vote_weighted(self, engine):
        """Test weighted voting."""
        # ... test implementation
```

### Minimum Coverage

- **New code**: 80% minimum
- **Critical code**: 95% minimum
- **Existing code**: Don't reduce coverage

---

## 📖 Documentation

### Docstrings

Google Style format:

```python
def process_consensus(
    responses: List[Dict],
    strategy: str = "majority"
) -> Dict[str, Any]:
    """
    Process multiple responses to obtain consensus.
    
    This function analyzes responses from different LLM models
    and applies a consensus strategy to obtain the best
    possible answer.
    
    Args:
        responses: List of model responses with metadata.
            Each response must contain 'model' and 'response'.
        strategy: Consensus strategy to use.
            Options: 'majority', 'weighted', 'merger'.
            Default: 'majority'.
    
    Returns:
        Dictionary containing:
            - 'consensus': Final response
            - 'confidence': Confidence score (0-1)
            - 'models_used': List of consulted models
    
    Raises:
        ValueError: If responses is empty or strategy invalid.
        ConsensusError: If unable to obtain consensus.
    
    Examples:
        >>> responses = [
        ...     {"model": "phi3", "response": "Paris"},
        ...     {"model": "gemma2", "response": "Paris"}
        ... ]
        >>> result = process_consensus(responses)
        >>> result['consensus']
        'Paris'
    
    Note:
        The 'weighted' strategy requires confidence scores
        in each response.
    """
    ...
```

### README and Guides

- Use Markdown
- Add concrete examples
- Include diagrams if helpful (mermaid, ASCII art)
- Keep table of contents up to date

---

## ©️ Copyright

### Contribution Agreement

**BY SUBMITTING A CONTRIBUTION, YOU AGREE THAT**:

1. **Rights transfer**: You transfer all your copyright to the contribution to Génie IA Centre Opérationnel Sécurité inc.

2. **License**: Your contribution will be subject to the same proprietary license as the main project.

3. **Attribution**: You will be credited in release notes and AUTHORS.md, but will have no ownership rights over the code.

4. **Warranties**: You warrant that:
   - The contribution is your original work
   - You have the right to submit it
   - It doesn't violate any intellectual property rights

### Attribution

Contributors are credited in:
- `AUTHORS.md` - List of contributors
- Release notes (CHANGELOG.md)
- Code comments if major contribution

---

## 🎯 Project Priorities

### Short Term (Q1 2025)

1. Consensus system stabilization
2. Memory management improvements
3. Performance optimizations
4. Complete API documentation

### Medium Term (2025)

1. Support for new LLM models
2. Enhanced web interface
3. Plugin system
4. Multi-server deployment

### Long Term

1. AnimaOS integration
2. LLMUI server federation
3. Model marketplace
4. Advanced multilingual support

---

## 📞 Communication

### Channels

- **GitHub Issues**: Bugs and features
- **GitHub Discussions**: General questions
- **Email**: dev@genie-ia.ca (active contributors)

### Response Times

- **Issues**: 2-5 business days
- **Pull Requests**: 1-2 weeks
- **Urgent questions**: Email

---

## 🏆 Recognition

Active contributors may receive:

1. **Public credit** in AUTHORS.md
2. **Mention** in releases
3. **Priority access** to new features
4. **Invitation** to development meetings (regular contributors)

---

## 📜 History

- **2025-11-21**: Initial version of contribution guide

---

## Questions?

Feel free to:
- Open a discussion on GitHub
- Contact the team: contact@llmui.org
- Check documentation: docs/

---

**Thank you for contributing to LLMUI Core!** 🙏

*Together for Quebec's digital sovereignty* 🇨🇦

---

**Francois Chalut** - 2025
