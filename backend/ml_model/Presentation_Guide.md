# AI-Powered Requirements Engineering System: Presentation Guide

This document is structured as a **ready-to-present guide** for your Viva or project defense. You can use these sections as slides or talking points to confidently explain your research and solution.

---

## 1. Introduction & Problem Statement
**"Good morning/afternoon everyone. Today I am presenting my research on an AI-Powered Requirements Engineering System."**

* **The Problem:** Traditional requirements engineering is a highly manual, time-consuming, and error-prone process. Business Analysts (BAs) spend countless hours reading unstructured requirement sentences from clients, manually checking them for grammatical completeness, categorizing them, and writing out standardized Agile artifacts like Epics, User Stories, and Acceptance Criteria.
* **The Solution:** I have developed a full-stack, AI-driven web application that automates this entire pipeline. The system takes raw client requirements in an Excel format, validates them using Natural Language Processing (NLP), classifies them using Machine Learning, and dynamically generates standard development artifacts.

---

## 2. System Architecture Overview
**"To solve this, I designed a three-tier architecture that separates the user interface, data management, and machine learning processing."**

* **Frontend (React.js):** Provides a modern, responsive interface where BAs can drag-and-drop Excel templates. It displays the AI analysis in real-time and allows manual overrides.
* **Backend (Node.js & SQLite):** Acts as the orchestrator. It parses the Excel files, temporarily stores the requirements in an embedded SQLite database for fast retrieval, and coordinates the communication between the UI and the AI Engine.
* **AI Engine (Python):** The core intelligence of the system. It runs independently so it can utilize powerful Python libraries like `spaCy` for NLP and `scikit-learn` for Machine Learning, without blocking the web server.

---

## 3. The AI & Machine Learning Pipeline (Core Research)
**"The most critical part of my research is the AI Engine. It performs three main tasks in a single pipeline."**

**Step 1: NLP Completeness Checking (`spaCy`)**
* The system doesn't just count words; it understands grammar.
* It uses `spaCy` to parse the dependency tree of every sentence.
* It checks if a requirement has a **Subject** (Who?), a **Verb** (Does what?), and a **Modal Keyword** (like "shall" or "must"). If any are missing, it flags the requirement as "Incomplete" and tells the user exactly why.

**Step 2: Dynamic Architecture Extraction (Dependency Parsing)**
* Instead of mapping to predefined buckets or using simple keywords, the system uses NLP to understand the *grammatical structure* of the requirement.
* It parses the dependency tree to find the `ROOT` action (Verb) and its direct object (Noun). 
* For example, from "The system shall allow users to update patient records", it extracts "update" (Verb) and "records" (Noun). It dynamically generates an Epic: **"Records Management"**, and a Feature: **"Update Records"**. This naturally clusters similar requirements together!

**Step 3: Dynamic Artifact Generation**
* After assigning the Epic and Feature, it uses template-based generation to strip out formal language ("The system shall") and rewrite the requirement into standard **User Stories** (*"As a System User, I want..."*) and **Acceptance Criteria**.

---

## 4. Live Demonstration Walkthrough
*(If you are required to show the software running, use these steps)*

**"I will now demonstrate the system in action."**
1. **Upload:** "Here is the React interface. I am uploading a standard client Excel file containing raw requirement descriptions."
2. **Process:** "When I click 'Run AI Analysis', Node.js streams these requirements into the Python AI Engine. You can see the UI updates instantly."
3. **Review Validation:** "Notice how Requirement 006 is flagged in red. The NLP engine detected it was 'Too short' or missing a verb, proving the validation works."
4. **Review Generation:** "For the complete requirements, notice the right-hand column. The NLP semantic matcher successfully categorized them into predefined Healthcare Epics and Features, and generated perfect User Stories and Acceptance Criteria."
5. **Export:** "Finally, the BA can click 'Export Excel' to download the processed data, ready to be imported directly into Jira or Azure DevOps."

---

## 5. Conclusion & Future Work
**"To conclude my presentation..."**

* **Impact:** This system drastically reduces the manual overhead for Business Analysts. It ensures requirements are grammatically complete before development begins, and standardizes Agile artifact creation.
* **Future Work:** In the future, this system could be enhanced by integrating Large Language Models (LLMs) like GPT-4 to generate even more detailed Acceptance Criteria, or by building direct API integrations into Jira so the exported Excel step can be bypassed.

**"Thank you. I am now open to any questions."**

---

### Potential Viva Questions & How to Answer Them:

**Q1: Why did you use NLP Dependency Parsing for Epics and Features instead of a Machine Learning classification model like SVM?**
*Answer:* "While Machine Learning models are great for classifying data into known categories, they require thousands of labeled examples to train correctly. By using `spaCy` to construct an Abstract Syntax Tree of the sentence, I can dynamically extract the *exact* noun and verb the client used without needing any training data! This naturally clusters related requirements (like all requirements affecting 'patients') into the same Epic automatically, making the architecture dynamic and completely independent of the dataset."

**Q2: Why use Node.js for the backend instead of just writing the whole thing in Python (Django/Flask)?**
*Answer:* "Node.js is incredibly fast and asynchronous, making it perfect for handling file uploads, API requests, and database management. By keeping Node.js as the web server and Python purely as a background AI worker, the architecture is scalable. If the AI processing takes a long time, it won't freeze the web server."

**Q3: How does the grammar checking actually work?**
*Answer:* "I used the `spaCy` library to build an Abstract Syntax Tree (AST) of the sentence. Instead of just looking for specific words, it looks for parts of speech. For example, it specifically searches for tokens labeled as 'nsubj' (nominal subject) to guarantee the requirement specifies *who or what* is performing the action."
