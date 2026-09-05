<<<<<<< Updated upstream
# GitHub Governance and Team Controls



=======
# 🛡️ GitHub Governance and Team Controls
 
This document defines the governance rules, branch strategy, and pull request workflow for the **CivicConnect-Application** repository. All team members are required to follow these controls to maintain code quality, accountability, and a stable `main` branch.
 
---
 
## 📌 Table of Contents
 
- [Governance Rules](#-governance-rules)
- [Branch Strategy](#-branch-strategy)
- [Pull Request Workflow](#-pull-request-workflow)
---
 
## 📋 Governance Rules
 
| Control | Rule |
| :--- | :--- |
| **Repository** | There will only be a single repository used on GitHub, called `CivicConnect-Application`. |
| **Main Branch** | This branch represents the protected, stable state of the project — it must always be in a working condition. |
| **Direct Development on Main** | Under no circumstances is any person allowed to commit directly to `main`. |
| **Branches** | All work must be committed to a dedicated branch before it can be merged into `main` (e.g. `docs/requirement` for the requirements document). |
| **Pull Request** | Before work is merged into `main`, a pull request must be opened. A minimum of **two** team members must review and approve the work. |
| **Approval** | Work must be approved by a minimum of **two** reviewers before it can be merged into `main`. |
| **Self-Approval** | Self-approval is **not permitted**. A person may believe their work is correct, but it must still be independently validated against sound software engineering principles. |
| **Review Quality** | Reviewers must provide meaningful, actionable feedback. Comments such as *"Code is good"* are not acceptable, as they do not meet project review standards. |
| **Secrets** | Any sensitive and confidential information such as API keys, passwords, private keys, and tokens may NEVER be committed on the repository. |
| **History** | Every committ, pull request, merge, and change must show progression and not bulk uploads |
 
---
 
## 🌿 Branch Strategy
 
The following branches will be used to commit work before it progresses to `main`.
 
### Documentation Branches
 
| Branch | Purpose |
| :--- | :--- |
| `docs/problem-business-need` | Project charter and business value |
| `docs/stakeholder-analysis` | Analysis of key stakeholders |
| `docs/scope-baseline` | In-scope, out-of-scope, and deferred scope items |
| `docs/requirement` | Requirements document with acceptance criteria |
| `docs/constraints` | Analysis and record of project constraints |
| `docs/rtm` | Requirements Traceability Matrix |
| `docs/risk-register` | Identification and analysis of project risks |
| `docs/forward-engineering` | Identification and explanation of early lifecycle concerns |
| `docs/engineering-decision-log` | Decision log for recorded engineering decisions |
| `docs/github-governance` | GitHub governance and team controls (this document) |
| `docs/ai-usage-register` | Live register tracking AI usage and assistance |
| `docs/PED` | Fully working PED containing all of the above project elements |
 
> **Note:** Additional branches will be created as further project instructions are received.
 
---
 
## 🔄 Pull Request Workflow
 
Follow these steps whenever creating and submitting a pull request.
 
### 1. Create a Branch
Navigate to the repository on your computer, then create a new branch:
```bash
cd path/to/repository
git checkout -b docs/requirements
```
 
### 2. Make Your Changes
Edit the relevant part of the project.
 
### 3. Commit Your Changes
```bash
git add .
git commit -m "Update requirements"
```
 
### 4. Verify the Commit
```bash
git status
```
 
### 5. Push to GitHub
```bash
git push origin docs/requirements
```
 
### 6. Open the Repository on GitHub
Navigate to the project repository on the GitHub website.
 
### 7. Start the Pull Request
Click the green **Compare & pull request** button.
 
### 8. Set the Branch Comparison
- **Base branch:** `main`
- **Compare branch:** the branch containing your changes
### 9. Add Details
Provide a clear, descriptive title and description of the changes.
 
### 10. Create the Pull Request
Click the green **Create pull request** button.
 
### 11. Request Reviews
A minimum of **two** team members must review the pull request.
 
### 12. Provide Feedback
Reviewers give meaningful feedback aligned with project standards.
 
### 13. Merge
Once feedback has been addressed and both approvals are given, merge the pull request.
 
### 14. Done ✅
The change is now committed to the `main` branch.
>>>>>>> Stashed changes
