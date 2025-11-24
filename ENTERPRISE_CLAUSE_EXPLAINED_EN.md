# 📢 SPECIAL ENTERPRISE CLAUSE - MANDATORY PUBLICATION

## Summary of the New Clause

This clause has been added to the AGPL v3 + Commons Clause license of LLMUI Core to ensure that enterprises contribute to the open source ecosystem.

---

## 🎯 Objective

Prevent large companies from:
1. Taking open source code for free
2. Modifying it privately for their needs
3. Never contributing their improvements to the community

---

## ⚖️ Who is Affected?

### ✅ SUBJECT to mandatory publication:

**Enterprises** defined as any entity having:
- **More than 5 employees**, OR
- **Annual revenue** (regardless of amount), OR
- **Commercial structure** (Inc., LLC, SA, Corporation, etc.)

**Examples**:
- ✅ Startup with 10 people → SUBJECT
- ✅ SME with 50 employees → SUBJECT
- ✅ Large company (Google, Microsoft, etc.) → SUBJECT
- ✅ Incorporated consulting firm with employees → SUBJECT

### ❌ EXEMPT from mandatory publication:

- ❌ **Individuals** working alone
- ❌ **Students** (even if doing an internship in a company)
- ❌ **Academic researchers** (universities)
- ❌ **Non-profit organizations** (NPOs, associations, foundations)
- ❌ **Solo freelancers** (< 5 employees, not incorporated or alone)

**Examples**:
- ❌ Independent solo developer → EXEMPT
- ❌ Master's student → EXEMPT
- ❌ University professor → EXEMPT
- ❌ Community association → EXEMPT

---

## 📋 Precise Obligations for ENTERPRISES

If you modify LLMUI Core, you must:

### 1. 📢 PUBLISH the modified code
- On a **public** Git repository (GitHub, GitLab, Codeberg, etc.)
- With a link **accessible to all** (no private repository)
- With the **same license** (AGPL v3 + Commons Clause)

### 2. ⏱️ Within 30 DAYS
- From **first use** (internal or external)
- No additional delay
- Clock starts as soon as modified code is executed

### 3. 📝 DOCUMENT the modifications
- Clearly describe what was changed
- Explain why (optional but recommended)
- Maintain a CHANGES.md file or similar

### 4. 🔓 MAINTAIN the public repository
- For the **entire duration of use**
- You cannot make it private later
- If you stop using it, you can archive the repository

### 5. 💤 CREDIT the original author
- Mention François Chalut in the README
- Link to the original project
- Respect copyright notices

---

## ⚠️ IMPORTANT: Even for INTERNAL Use

This clause applies **EVEN IF**:
- ❌ You only use the software internally
- ❌ You don't distribute it externally
- ❌ You don't offer a network service
- ❌ Modifications are minor (bug fixes, UI, etc.)

**Concrete example**:

```
A 20-employee company:
1. Downloads LLMUI Core
2. Modifies the interface to adapt to their brand guidelines
3. Uses it only on their internal server

→ OBLIGATION: Publish modified code within 30 days on GitHub
```

---

## 🚫 What Happens if Not Complied?

### Immediate Sanctions:

1. **License revocation**
   - Immediate and **permanent** loss of the right to use the software
   - Obligation to **cease all use**

2. **Legal action**
   - **Damages** according to applicable laws
   - **Legal fees** at your expense
   - Lawsuits in **Quebec, Canada**

3. **Publication of violation**
   - Violation may be **made public**
   - Damage to company **reputation**
   - Public list of violations (Hall of Shame)

---

## ✅ How to Comply (Practical Guide)

### Step 1: Determine if you're subject
```
Ask yourself:
- Do I have more than 5 employees? → YES = Enterprise
- Does my entity have revenue? → YES = Enterprise
- Am I incorporated (Inc., LLC)? → YES = Enterprise

If YES to at least one question → You are subject
```

### Step 2: Before modifying
```
1. Create a public Git repository on GitHub
2. Name it clearly (e.g., "llmui-core-company-fork")
3. Add the original LICENSE file
4. Add a README explaining your modifications
```

### Step 3: During development
```
1. Commit your modifications regularly
2. Document each important change
3. Maintain a CHANGES.md file
```

### Step 4: Before first use
```
1. Ensure the repository is public
2. Push all your commits
3. Add a link to the original project
4. Credit François Chalut
```

### Step 5: Notification (optional but recommended)
```
Send an email to contact@llmui.org with:
- Your company name
- Link to your public repository
- Brief description of your modifications

This helps avoid any misunderstanding
```

---

## 💡 Why This Clause?

### Problem Identified:

**Before** (AGPL alone):
```
Large company:
1. Takes free AGPL code ✅
2. Modifies for internal use ✅
3. Doesn't distribute → No obligation to publish ✅
4. Keeps all improvements private ✅
5. Community never benefits from these improvements ❌
```

**After** (AGPL + Enterprise clause):
```
Large company:
1. Takes free AGPL code ✅
2. Modifies for internal use ✅
3. MUST publish within 30 days ⚠️
4. Community benefits from improvements ✅
5. Strengthened open source ecosystem ✅
```

### Benefits:

1. **Fairness**: Large companies contribute as much as they take
2. **Transparency**: Everyone sees what's being developed
3. **Innovation**: Improvements benefit everyone
4. **Community**: Stronger and more collaborative ecosystem
5. **Protection**: Prevents private appropriation of open source code

---

## 🤔 Specific Frequently Asked Questions

### Q: I'm a 3-person startup, am I affected?
**A**: NO, < 5 employees = exempt.

### Q: I'm a freelancer with a single-person LLC?
**A**: NO, alone = exempt (even if commercial structure).

### Q: My company uses LLMUI without modifications?
**A**: NO, no obligation. The clause only applies to modifications.

### Q: We fixed a simple typo bug, must we publish?
**A**: YES, any modification, even minor, must be published.

### Q: Can we delay publication by 6 months for strategic reasons?
**A**: NO, 30 days maximum. For a delay, contact for commercial license.

### Q: Can our fork have a different name?
**A**: YES, but you must clearly indicate it's based on LLMUI Core.

### Q: Must we publish our internal data/configs?
**A**: NO, only source code. Not data, sensitive configs, or API keys.

### Q: What happens if we forget and publish on day 35?
**A**: Contact contact@llmui.org immediately to regularize. Good faith counts.

### Q: Is this clause legally valid?
**A**: YES, it's an additional condition to AGPL v3, perfectly legal.

### Q: Is a university with commercial budget exempt?
**A**: YES, academic institutions are exempt even if they have budgets.

---

## 📊 Summary Table

| Entity Type | Employees | Revenue | Modifies | Publication Required? |
|-------------|-----------|---------|----------|----------------------|
| Individual | 1 | No | Yes | ❌ NO |
| Student | - | No | Yes | ❌ NO |
| Solo freelance | 1 | Yes | Yes | ❌ NO |
| NPO | 10 | Non-profit | Yes | ❌ NO |
| Startup | 3 | Yes | Yes | ❌ NO (< 5) |
| Startup | 10 | Yes | Yes | ✅ YES |
| SME | 50 | Yes | Yes | ✅ YES |
| Large company | 1000+ | Yes | Yes | ✅ YES |
| Company | 10 | Yes | No | ❌ NO (not modified) |

---

## 🎯 Typical Use Cases

### Case 1: Tech Startup (15 employees)

**Situation**: Uses LLMUI, adds integration with their internal API

**Obligations**:
1. ✅ Publish integration code within 30 days
2. ✅ Keep repository public
3. ❌ No need to publish their private API (non-LLMUI code)

### Case 2: Large Company (500 employees)

**Situation**: Deploys LLMUI, modifies UI for their brand guidelines

**Obligations**:
1. ✅ Publish all UI modifications within 30 days
2. ✅ Document changes
3. ✅ Credit François Chalut
4. ⚠️ CANNOT keep these modifications private

### Case 3: Solo Consultant

**Situation**: Installs LLMUI at a client's, makes modifications

**Obligations**:
1. ❌ No obligation (solo = exempt)
2. ✅ But if CLIENT is a company → Client must publish

### Case 4: University

**Situation**: Researchers modify LLMUI for research project

**Obligations**:
1. ❌ No immediate obligation (academic = exempt)
2. ✅ Encouraged to publish (open science)
3. ✅ Must publish if distributed or used via network

---

## 📧 Contact and Clarifications

If you have doubts about your situation:

**François Chalut**
- Email: contact@llmui.org
- Web: https://llmui.org
- Tel: +1 (514) 443-2003

**Better to ask than risk a violation!**

---

## 📝 Summary in One Sentence

**If you are an enterprise (>5 employees OR revenue) and you modify LLMUI Core, you MUST publish your code on GitHub within 30 days, even for internal use only.**

---

## ⚖️ Legal

This clause is an additional condition of use compliant with:
- Section 7 of GNU GPL v3 (Additional Terms)
- Applied in addition to AGPL v3
- Subject to the laws of Quebec, Canada

---

**Last updated**: 2025-11-21  
**License version**: AGPL v3 + Commons Clause + Enterprise Clause  
**Author**: François Chalut

*For digital sovereignty and fair open source* 🇨🇦
