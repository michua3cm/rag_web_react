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

5. **Configure your API key**  
   Open the `.env.example` file and copy its contents into a new `.env` file (if it doesn’t already exist).  
   Then replace the placeholder API key with your own.

6. **Start the backend server**

    ```bash
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8888
    ```

7. **Start the web UI**

    ```bash
    npm start
    ```

8. **Open your browser (if not automatically opened) and navigate to**

    [http://localhost:3000](http://localhost:3000)

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
│   ├── .venv/                            # Python virtual environment (ignored)
│   ├── requirements.txt                  # Python dependencies
│   └── .gitignore                        # Backend-specific ignore rules
│
├── frontend/
│   ├── public/
│   │   └── index.html                    # Main HTML entry
│   ├── src/
│   │   ├── App.js                        # React root component
│   │   ├── App.css                       # App-level styling
│   │   ├── CodeRenderer.js               # Custom Markdown code block renderer
│   │   ├── index.js                      # React entry point
│   │   └── setupProxy.js                 # Proxy setup to call FastAPI backend
│   ├── package.json                      # Frontend dependencies & scripts
│   ├── .env                              # Local frontend environment variables
│   └── .gitignore                        # Frontend-specific ignore rules
│
├── .env.example                          # Example environment template (for both BE/FE)
├── .gitignore                            # Global ignore rules (root-level)
└── README.md                             # Project documentation
```
