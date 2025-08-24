export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api") {
      return handleAPIRequest(request);
    }

    if (url.pathname.startsWith("/download/")) {
      return proxyDownload(url.pathname.replace("/download/", ""));
    }

    return serveFrontend();
  }
};

async function handleAPIRequest(request) {
  try {
    const reqBody = await request.json();
    const googlePhotosURL = reqBody.url;

    if (!isValidURL(googlePhotosURL)) {
      return new Response(JSON.stringify({ error: "Invalid URL. Please enter a valid Google Photos public link." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const directLink = await getGoogleUserContentURL(googlePhotosURL);

    if (directLink) {
      const encodedPath = btoa(directLink);
      return new Response(JSON.stringify({ proxy_link: `/download/${encodedPath}` }), {
        headers: { "Content-Type": "application/json" }
      });
    } else {
      return new Response(JSON.stringify({ error: "Failed to fetch direct download link." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

async function proxyDownload(encodedPath) {
  try {
    const directLink = atob(encodedPath);

    if (!isValidURL(directLink)) {
      return new Response("Invalid request", { status: 400 });
    }

    const response = await fetch(directLink, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    if (!response.ok) {
      return new Response("Failed to fetch file", { status: 500 });
    }

    let filename = "download";
    const contentDisposition = response.headers.get("Content-Disposition");

    if (contentDisposition && contentDisposition.includes("filename=")) {
      filename = contentDisposition.split("filename=")[1].replace(/["']/g, "");
    } else {
      const urlParts = new URL(directLink).pathname.split("/");
      filename = urlParts[urlParts.length - 1] || filename;
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    return new Response("Error processing download", { status: 500 });
  }
}

function isValidURL(url) {
  try {
    new URL(url);
    return url.startsWith("https://photos.app.goo.gl/") || url.startsWith("https://video-downloads.googleusercontent.com/");
  } catch (e) {
    return false;
  }
}

async function getGoogleUserContentURL(googlePhotosURL) {
  try {
    const response = await fetch(googlePhotosURL, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const responseBody = await response.text();
    const regex = /https:\/\/video-downloads\.googleusercontent\.com\/[^\s"]+/;
    const match = responseBody.match(regex);

    return match ? match[0] : null;
  } catch (error) {
    return null;
  }
}

function serveFrontend() {
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MohanishX - Google Photos Direct Downloader</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
      <style>
          :root {
              --primary-color: #4285f4;
              --secondary-color: #2b6cd4;
              --background: #f8f9fa;
              --text-color: #202124;
          }

          * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
          }

          body {
              font-family: 'Segoe UI', Arial, sans-serif;
              background-color: var(--background);
              color: var(--text-color);
          }

          .navbar {
              background: var(--primary-color);
              padding: 1rem 2rem;
              box-shadow: 0 2px 5px rgba(0,0,0,0.1);
              position: fixed;
              width: 100%;
              top: 0;
              z-index: 1000;
          }

          .navbar-content {
              max-width: 1200px;
              margin: 0 auto;
              display: flex;
              justify-content: space-between;
              align-items: center;
          }

          .brand {
              color: white;
              font-size: 1.5rem;
              font-weight: 600;
              text-decoration: none;
              display: flex;
              align-items: center;
              gap: 0.5rem;
          }

          .container {
              max-width: 800px;
              margin: 100px auto 40px;
              padding: 2rem;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.05);
          }

          .input-group {
              position: relative;
              margin: 2rem 0;
          }

          .input-field {
              width: 100%;
              padding: 1rem;
              border: 2px solid #e0e0e0;
              border-radius: 8px;
              font-size: 1rem;
              transition: border-color 0.3s ease;
          }

          .input-field:focus {
              outline: none;
              border-color: var(--primary-color);
              box-shadow: 0 0 0 3px rgba(66,133,244,0.1);
          }

          .btn {
              background: var(--primary-color);
              color: white;
              padding: 1rem 2rem;
              border: none;
              border-radius: 8px;
              font-size: 1rem;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.3s ease;
              display: inline-flex;
              align-items: center;
              gap: 0.5rem;
          }

          .btn:hover {
              background: var(--secondary-color);
              transform: translateY(-1px);
              box-shadow: 0 3px 8px rgba(0,0,0,0.15);
          }

          #result {
              margin-top: 2rem;
              padding: 1.5rem;
              border-radius: 8px;
              transition: all 0.3s ease;
          }

          .result-success {
              background: #e8f0fe;
              border: 2px solid var(--primary-color);
          }

          .result-error {
              background: #fce8e6;
              border: 2px solid #d93025;
          }

          .loading {
              display: inline-block;
              width: 24px;
              height: 24px;
              border: 3px solid rgba(255,255,255,0.3);
              border-radius: 50%;
              border-top-color: white;
              animation: spin 1s ease-in-out infinite;
          }

          @keyframes spin {
              to { transform: rotate(360deg); }
          }

          .download-link {
              word-break: break-all;
              color: var(--primary-color);
              text-decoration: none;
              font-weight: 500;
              display: flex;
              align-items: center;
              gap: 0.5rem;
          }

          .download-link:hover {
              text-decoration: underline;
          }

          .features {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 2rem;
              margin-top: 3rem;
              padding: 2rem 0;
          }

          .feature-card {
              padding: 1.5rem;
              background: white;
              border-radius: 8px;
              text-align: center;
              box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }

          footer {
              text-align: center;
              padding: 2rem;
              color: #5f6368;
              border-top: 1px solid #e0e0e0;
              margin-top: 3rem;
          }

          @media (max-width: 768px) {
              .container {
                  margin: 80px 1rem 2rem;
                  padding: 1.5rem;
              }
              
              .navbar {
                  padding: 1rem;
              }
          }
      </style>
  </head>
  <body>
      <nav class="navbar">
          <div class="navbar-content">
              <a href="#" class="brand">
                  <i class="fas fa-cloud-download-alt"></i>
                  MohanishX Service
              </a>
              <div class="nav-links">
                  <a href="#" class="btn">Home</a>
                  <a href="#" class="btn">About</a>
                  <a href="#" class="btn">Contact</a>
              </div>
          </div>
      </nav>

      <div class="container">
          <h1>Google Photos Direct Downloader</h1>
          <p class="description">Get direct download links for your Google Photos instantly</p>

          <div class="input-group">
              <input type="text" id="photoUrl" class="input-field" 
                     placeholder="Paste your Google Photos share link here...">
          </div>
          <button onclick="generateLink()" class="btn">
              <i class="fas fa-magic"></i>
              Generate Download Link
          </button>

          <div id="result"></div>

          <div class="features">
              <div class="feature-card">
                  <i class="fas fa-bolt icon"></i>
                  <h3>Instant Conversion</h3>
                  <p>Get your direct download link in seconds</p>
              </div>
              <div class="feature-card">
                  <i class="fas fa-shield-alt icon"></i>
                  <h3>Secure & Private</h3>
                  <p>We don't store any of your data</p>
              </div>
              <div class="feature-card">
                  <i class="fas fa-mobile-alt icon"></i>
                  <h3>Mobile Friendly</h3>
                  <p>Works perfectly on all devices</p>
              </div>
          </div>
      </div>

      <footer>
          <p>© 2023 MohanishX Service. All rights reserved.</p>
      </footer>

      <script>
          async function generateLink() {
              const photoUrl = document.getElementById("photoUrl").value;
              const resultDiv = document.getElementById("result");

              if (!photoUrl) {
                  resultDiv.innerHTML = \`
                      <div class="result-error">
                          <i class="fas fa-exclamation-circle"></i>
                          Please enter a valid Google Photos URL
                      </div>\`;
                  return;
              }

              resultDiv.innerHTML = \`
                  <div class="result-success">
                      <div class="loading"></div>
                      Processing your request...
                  </div>\`;

              try {
                  const response = await fetch("/api", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ url: photoUrl })
                  });

                  const data = await response.json();

                  if (data.proxy_link) {
                      resultDiv.innerHTML = \`
                          <div class="result-success">
                              <a href="\${data.proxy_link}" class="download-link" target="_blank">
                                  <i class="fas fa-download"></i>
                                  Download Now
                              </a>
                              <button onclick="copyLink('https://cdn-s1.mohanishx1.workers.dev\${data.proxy_link}')" class="btn" style="margin-top: 1rem;">
                                  <i class="fas fa-copy"></i>
                                  Copy Link
                              </button>
                          </div>\`;
                  } else {
                      resultDiv.innerHTML = \`
                          <div class="result-error">
                              <i class="fas fa-times-circle"></i>
                              \${data.error || "Failed to generate download link"}
                          </div>\`;
                  }
              } catch (error) {
                  resultDiv.innerHTML = \`
                      <div class="result-error">
                          <i class="fas fa-times-circle"></i>
                          Connection error. Please try again
                      </div>\`;
              }
          }

          function copyLink(link) {
              navigator.clipboard.writeText(link);
              alert('Link copied to clipboard!');
          }
      </script>
  </body>
  </html>`;

  return new Response(html, { headers: { "Content-Type": "text/html" } });
}