# RAG Web React

## How to Use

1. **Create Python virtual environment**

    ```bash
    cd backend
    python -m venv <env_name>   # replace <env_name> with any name you prefer
    ```

2. **Activate the virtual environment**

    - Windows

        ```bash
        .venv\Scripts\activate
        ```

    - macOS/Linux

        ```bash
        source .venv/bin/activate
        ```

3. **Install Python dependencies**

    ```bash
    pip install -r requirements.txt
    ```

4. **Install JavaScript dependencies**

    Open a new terminal tab or window:

    ```bash
    cd frontend
    npm install
    ```

5. **Configure your environment variables**

    Copy the `.env.example` file and rename it to `.env` (if it doesn’t already exist).  
    Then update the following values with your own credentials and backend configuration:

    - **API keys:**  
      Replace the placeholder keys (`GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `DMS_API_KEY`) with your own.

    - **Host and Port:**

        ```
        HOST=0.0.0.0
        PORT=1234
        ```

    - **Frontend proxy target:**
        ```
        REACT_APP_API_IP=127.0.0.1
        ```

6. **Start the backend server**

    ```bash
    python -m app.main
    ```

7. **Start the web UI**

    ```bash
    npm start
    ```

8. **Open your browser (if not automatically opened) and navigate to**

    [http://localhost:3000](http://localhost:3000)

> Note: If you’re using VS Code, it’s highly recommended to install the suggested extensions.

## Project Structure

```
rag_web_react/
├── backend/
│   ├── app/
│   │   ├── api/                          # FastAPI route definitions
│   │   │   ├── routes_chat.py            # Chat endpoints (Gemini, OpenRouter, DMS)
│   │   │   └── routes_health.py          # Health check endpoint
│   │   │
│   │   ├── core/                         # Core configuration & setup
│   │   │   ├── config.py                 # Logging and global config
│   │   │   ├── paths.py                  # Centralized path constants (cache, templates)
│   │   │   └── rag_init.py               # Initializes RAG system on startup
│   │   │
│   │   ├── services/                     # Business logic & integrations
│   │   │   ├── rag_core.py               # RAG core setup and retrieval logic
│   │   │   └── st_code_parser_backend.py # Structured Text code parser service
│   │   │
│   │   ├── utils/                        # Utility functions (streaming, helpers)
│   │   │   └── stream_utils.py           # Stream response generator for SSE
│   │   │
│   │   ├── templates/                    # (optional) Jinja2 templates
│   │   ├── cache/                        # Cached or temporary files (ignored by Git)
│   │   └── main.py                       # FastAPI app entry point
│   │
│   └── requirements.txt                  # Python dependencies
│
├── frontend/
│   ├── public/
│   │   └── index.html                    # Main HTML entry
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── CodeBlockRenderer.jsx     # Custom Markdown code block renderer
│   │   │   └── HybridTextField.jsx       # General text field component
│   │   │
│   │   ├── features/
│   │   │   ├── ModelSelector.jsx         # Select the LLM model
│   │   │   ├── Settings.jsx              # Setup the chatbot settings
│   │   │   ├── ChatBox.jsx               # Main chatting area
│   │   │   ├── InputBar.jsx              # Type anything to chat
│   │   │   ├── ChatLayout.jsx            # Define the full layout of chatbot
│   │   │   └── index.js
│   │   │
│   │   ├── settings/
│   │   │   ├── context.js                # React context provider for settings state (theme, options, etc.)
│   │   │   └── registry.js               # Central registry of all available settings (metadata, types, handlers)
│   │   │
│   │   ├── utils/
│   │   │   ├── copyText.js               # Copy functionality
│   │   │   └── generateId.js             # Generate UUID
│   │   │
│   │   ├── styles/
│   │   │   ├── scrollbar.css             # Custom scrollbar styles for consistent UI across browsers
│   │   │   └── App.css
│   │   │
│   │   ├── App.jsx                       # React root component
│   │   ├── index.js                      # React entry point
│   │   └── setupProxy.js                 # Proxy setup to call FastAPI backend
│   │
│   ├── jsconfig.js                       # Path alias and JS compiler configuration for clean imports
│   └── package.json                      # Frontend dependencies & scripts
│
├── .env.example                          # Example environment template (for both BE/FE)
├── .prettierrc                           # Prettier configuration for code formatting rules
├── .gitignore                            # Global ignore rules (root-level)
└── README.md                             # Project documentation
```
