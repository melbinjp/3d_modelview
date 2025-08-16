# Security & Third-Party Concerns

This document outlines security considerations, including dependency vulnerabilities and potential attack vectors.

**Confidence Level:** High for dependency scan, Medium for manual code review.

---

### 1. Third-Party CDN Usage

-   **Concern:** The application loads all of its core dependencies, including `three.js`, directly from third-party CDNs (`cdnjs.cloudflare.com`, `cdn.jsdelivr.net`).
-   **Risk:**
    1.  **CDN Outage:** If the CDN is down or blocked, the application will not load, causing a denial of service. [Severity: Medium]
    2.  **Compromised CDN:** If the CDN itself is ever compromised, a malicious actor could replace the legitimate `three.js` scripts with malicious code. This would lead to a **Supply Chain Attack**, where every user of this application could be attacked. [Severity: Critical]
-   **Mitigation:**
    -   **Subresource Integrity (SRI):** The `<script>` tags can be protected with an `integrity` hash. The browser will only execute the script if its content matches the hash, preventing a compromised script from running.
        -   **Example:**
          ```html
          <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
                  integrity="sha512-4d/eLUDs1d9BqLq3oSOglDLhXQWvG5A2X0s2QhF/L9V2bS1M2/v8iS3/xM4b1a5h1b5/d2s3f4g5h6j7k8l9o0p=="
                  crossorigin="anonymous"></script>
          ```
        -   **Note:** The correct hash for each script would need to be generated.
    -   **Best Practice (Bundling):** The most robust solution is to stop using a CDN for critical JavaScript dependencies. By introducing a build system (like Vite or Webpack), `three.js` can be managed via `npm`, bundled locally, and served directly with the application. This eliminates the runtime dependency on the third-party CDN.

---

### 2. Dependency Vulnerability Scan

-   **Concern:** Outdated dependencies may have known security vulnerabilities.
-   **Action:** A `package.json` was created to formally manage the `three@0.128.0` dependency, and `npm audit` was run.
-   **Result:**
    ```
    $ npm audit
    found 0 vulnerabilities
    ```
-   **Conclusion:** [CONFIDENCE: HIGH] The specific version of `three.js` (r128) used in this project has **no known security vulnerabilities** according to the npm registry. However, it is severely outdated, and future vulnerabilities will not be patched for this version.

---

### 3. Potential for Cross-Site Scripting (XSS)

-   **Concern:** User-provided input (URLs) could be mishandled and lead to XSS attacks.
-   **Analysis:**
    -   **Model URL Input (`#modelUrl`):** The value from this input is passed directly to the `three.js` loaders. The loaders expect a URL to a model file. While a `javascript:` URL could theoretically be entered, `three.js` loaders are designed to fetch and parse data, not execute scripts from the URL itself. The risk here is considered **[LOW]**.
    -   **HDRI URL Input (`#hdriUrl`):** Similar to the model URL, this is passed to the `RGBELoader`. The risk is also considered **[LOW]**.
    -   **Error Messages:** The `showError(message)` function takes a string and sets it as the `textContent` of an element.
        ```javascript
        document.getElementById('errorMessage').textContent = message;
        ```
        Using `textContent` instead of `innerHTML` is the correct, safe way to display text, as it prevents any embedded HTML in the `message` string from being rendered. This correctly mitigates XSS risk. The implementation is **[SAFE]**.

---

### 4. Insecure Deserialization

-   **Concern:** Parsing complex file formats like 3D models can sometimes lead to vulnerabilities if the parsing library is flawed.
-   **Analysis:** The application relies on the official `three.js` loaders (`GLTFLoader`, `FBXLoader`, etc.). These loaders are widely used and battle-tested. While a vulnerability is always theoretically possible, the risk of a critical deserialization flaw in a mature library like `three.js` is **[LOW]**. The best mitigation is to keep the library up-to-date to receive any security patches as they are released.

---

### Security Recommendations Summary

1.  **[HIGH PRIORITY]** Stop using CDNs for critical JavaScript and introduce a build system to bundle dependencies locally. This is the single most important security improvement.
2.  **[MEDIUM PRIORITY]** If CDN use must be retained, add Subresource Integrity (SRI) hashes to all `<script>` tags to mitigate the risk of a CDN compromise.
3.  **[MEDIUM PRIORITY]** Upgrade the `three.js` dependency to the latest version to benefit from ongoing security patches and bug fixes.
