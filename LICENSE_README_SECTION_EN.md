# License Section for README.md

## Badge to Add at Top of README

```markdown
[![License: AGPL v3 + Commons Clause](https://img.shields.io/badge/License-AGPL%20v3%20%2B%20Commons%20Clause-blue.svg)](LICENSE)
```

Or with more details:

```markdown
[![License](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Commons Clause](https://img.shields.io/badge/Commons%20Clause-No%20Commercial%20Use-red.svg)](LICENSE)
```

---

## Section to Add in Main README

```markdown
## 📜 License

LLMUI Core is licensed under **GNU Affero General Public License v3.0 with Commons Clause**.

### In Summary:

✅ **You CAN**:
- Use for free
- View and modify code
- Share your modifications
- Use in enterprise (internal use - see clause below)
- Contribute to project

⚠️ **SPECIAL ENTERPRISE CLAUSE**:

**If you are an ENTERPRISE** (>5 employees OR commercial revenue) and you modify this software:

📢 **YOU MUST publish your modifications** on a public repository (GitHub/GitLab)  
⏱️ **Within 30 days** of first use  
🔓 **EVEN for internal use only**

**Exemptions**: Individuals, students, researchers, NPOs

❌ **You CANNOT**:
- Sell the software
- Offer as commercial service (SaaS)
- Generate revenue with it

🌐 **AGPL network clause**: If you use this software on a server, you must share your source code.

📄 **Complete license**: [LICENSE](LICENSE)

### Commercial License

For commercial use, contact us:
- 📧 Email: contact@llmui.org
- 🌐 Website: https://llmui.org
- 📱 Tel: +1 (514) 443-2003

---

*This license protects open source work from commercial exploitation while remaining freely accessible to all. The enterprise clause ensures that large organizations contribute to the community.*
```

---

## For CONTRIBUTING.md

Add this section:

```markdown
## License of Contributions

By contributing to LLMUI Core, you agree that:

1. **Your contribution will be under AGPL v3 + Commons Clause**
2. **You retain credit** for your work
3. **You transfer the necessary rights** to maintain the project
4. **You attest** that your contribution is your original work

Any contribution becomes an integral part of LLMUI Core and will be credited in CONTRIBUTORS.md.
```

---

## For NOTICE File (To Create)

```markdown
# LLMUI Core v0.5.0
Copyright © 2025 François Chalut

This software is distributed under the terms of the GNU Affero General Public License v3.0 with Commons Clause.

## Third-Party Components

LLMUI Core uses the following open source components:

- FastAPI (MIT License)
- Uvicorn (BSD License)
- Ollama (MIT License)
- aiohttp (Apache License 2.0)
- PyYAML (MIT License)
- SQLite (Public Domain)

See THIRD_PARTY_LICENSES.md file for complete licenses.

## Commons Clause Notice

Commercial use of this software is prohibited without appropriate license.
To obtain a commercial license: contact@llmui.org
```

---

## Alternative Badge with Icon

```markdown
[![License](https://img.shields.io/badge/license-AGPL--3.0--or--later%20WITH%20Commons--Clause-blue?style=for-the-badge)](LICENSE)
```

Or simple version:

```markdown
![License: AGPL v3 + CC](https://img.shields.io/badge/license-AGPL%20v3%20%2B%20Commons%20Clause-orange)
```

---

## Short Description for GitHub "About"

```
Multi-model AI consensus platform - AGPL v3 + Commons Clause (open but not commercial)
```

Or:

```
LLM consensus platform - Open Source (no commercial use) - Digital sovereignty 🇨🇦
```

---

## Recommended GitHub Topics

```
ai, llm, ollama, quebec, open-source, agpl, commons-clause, 
consensus, python, fastapi, sovereignty, no-commercial
```

---

## Message for GitHub Issues

Template for issues:

```markdown
## Before Creating an Issue

LLMUI Core is under AGPL v3 + Commons Clause license.

- ✅ Personal and educational use: FREE
- ✅ Contributions: Welcome!
- ❌ Commercial use: License required

If you have license questions: contact@llmui.org

---

[Your issue here]
```

---

## For Website Footer

```html
<footer>
  <p>
    LLMUI Core © 2025 François Chalut<br>
    Licensed under 
    <a href="https://www.gnu.org/licenses/agpl-3.0.html">AGPL v3</a> 
    with 
    <a href="https://commonsclause.com/">Commons Clause</a>
    <br>
    <small>Open Source but no commercial use</small>
  </p>
</footer>
```

---

## License Comparison

| License | Code visible | Modifiable | Commercial | SaaS | Network clause |
|---------|--------------|------------|------------|------|----------------|
| **Proprietary** | ❌ | ❌ | ❌ | ❌ | N/A |
| **MIT** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **GPL v3** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **AGPL v3** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **AGPL v3 + CC** | ✅ | ✅ | ❌ | ❌ | ✅ |

**AGPL v3 + Commons Clause = Best of both worlds!**

---

## Why This License?

### Problems Solved:

1. **MIT/GPL**: Companies can create commercial SaaS for free
2. **Proprietary**: No one can learn from code
3. **AGPL alone**: Still allows commercial use

### Advantages AGPL v3 + Commons Clause:

✅ Open source - everyone can learn  
✅ Collaborative - contributions encouraged  
✅ Protected - no commercial exploitation  
✅ Transparent - network clause forces sharing  
✅ Flexible - commercial licenses available

---

## Examples of Authorized Use

### ✅ YES - Personal Use
```
Install LLMUI at home to chat with local LLMs
No need to publish modifications
```

### ✅ YES - Education
```
Use in university AI course
Students can modify without publishing
```

### ✅ YES - Academic Research
```
Use for research project
Publication of modifications encouraged but not required
```

### ⚠️ YES BUT - Internal Enterprise Use
```
Deploy in your company for employees (no resale)
⚠️ IF YOU MODIFY: Publication mandatory within 30 days
```

**Example**: A 20-employee company installs LLMUI and:
- ✅ Uses original version without modification → OK, no publication
- ⚠️ Modifies interface or adds features → MUST publish on GitHub
- ⚠️ Fixes a bug → MUST publish the fix

### ✅ YES - Contribution
```
Fork, modify, propose pull requests
Contributions to main project always welcome
```

### ✅ YES - Solo Freelance
```
You're an independent consultant alone → No publication obligation
```

### ❌ NO - Commercial SaaS
```
Create "MyAIService.com" and charge users
Prohibited even with code publication
```

### ❌ NO - Sale
```
Sell LLMUI Core on a marketplace
Prohibited in all forms
```

### ❌ NO - Primary Paid Support
```
Charge primarily to install/configure LLMUI Core
Requires commercial license
```

### ❌ NO - Private Modifications (Enterprises)
```
Large company that modifies LLMUI and keeps code private
⚠️ LICENSE VIOLATION → Sanctions
```

---

## Text for Social Media

**Twitter/X**:
```
🚀 LLMUI Core v0.5.0 is now open source!

License: AGPL v3 + Commons Clause
= Open but not commercial

✅ Free for all
✅ Code accessible
✅ Modifications welcome
❌ No profit

#OpenSource #AI #Quebec #Sovereignty

https://github.com/your-repo/llmui-core
```

**LinkedIn**:
```
I'm happy to announce that LLMUI Core v0.5.0 is now open source under AGPL v3 with Commons Clause license.

This unique license allows:
• Everyone to use and learn from code for free
• Developers to contribute freely
• Protection from commercial exploitation by large companies

It's the perfect balance between knowledge sharing and intellectual property protection.

For Quebec's digital sovereignty 🇨🇦

#OpenSource #AI #LLM #Quebec #TechForGood
```

---

## Important to Note

### For Contributors:

**You retain your copyright** on your contributions, but agree they will be:
1. Under AGPL v3 + Commons Clause
2. Integrated into main project
3. Credited in CONTRIBUTORS.md

### For Users:

**If you modify and share**, you must:
1. Keep the same license
2. Publish your source code
3. Document your modifications
4. Credit François Chalut

### For Enterprises:

**For commercial use**, contact us for:
1. Custom commercial license
2. Professional support
3. Exclusive features
4. Consulting and training
