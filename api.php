<?php
declare(strict_types=1);

$isHttps = (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off")
    || (isset($_SERVER["SERVER_PORT"]) && (int) $_SERVER["SERVER_PORT"] === 443);

session_set_cookie_params([
    "lifetime" => 0,
    "path" => "/",
    "domain" => "",
    "secure" => $isHttps,
    "httponly" => true,
    "samesite" => "Lax",
]);
session_start();

header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");

const DEFAULT_API_BASES = [
    "http://127.0.0.1:8000/api",
    "http://localhost:8000/api",
];

function sendJson(int $status, array $payload): void
{
    http_response_code($status);
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function extractUserFromPayload(array $payload): array
{
    if (isset($payload["user"]) && is_array($payload["user"])) {
        return $payload["user"];
    }
    if (isset($payload["data"]["user"]) && is_array($payload["data"]["user"])) {
        return $payload["data"]["user"];
    }
    if (isset($payload["data"]) && is_array($payload["data"])) {
        return $payload["data"];
    }
    return [];
}

function extractTokenFromPayload(array $payload): string
{
    $candidates = [
        $payload["token"] ?? null,
        $payload["access_token"] ?? null,
        $payload["data"]["token"] ?? null,
        $payload["data"]["access_token"] ?? null,
    ];

    foreach ($candidates as $value) {
        if (is_string($value) && trim($value) !== "") {
            return trim($value);
        }
    }

    return "";
}

function getCurrentOriginApiBase(): string
{
    $host = trim((string) ($_SERVER["HTTP_HOST"] ?? ""));
    if ($host === "") {
        return "";
    }

    $isHttps = (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off")
        || (isset($_SERVER["SERVER_PORT"]) && (int) $_SERVER["SERVER_PORT"] === 443);
    $scheme = $isHttps ? "https" : "http";

    return $scheme . "://" . $host . "/api";
}

function getCurrentProjectApiBase(): string
{
    $host = trim((string) ($_SERVER["HTTP_HOST"] ?? ""));
    if ($host === "") {
        return "";
    }

    $scriptName = (string) ($_SERVER["SCRIPT_NAME"] ?? "");
    $projectDir = trim(str_replace("\\", "/", dirname($scriptName)), "/.");

    if ($projectDir === "") {
        return "";
    }

    $isHttps = (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off")
        || (isset($_SERVER["SERVER_PORT"]) && (int) $_SERVER["SERVER_PORT"] === 443);
    $scheme = $isHttps ? "https" : "http";

    return $scheme . "://" . $host . "/" . $projectDir . "/api";
}

function getBackendBaseUrls(): array
{
    $fromEnv = getenv("USEA_API_BASES");
    $urls = [];

    $currentOriginApi = getCurrentOriginApiBase();
    if ($currentOriginApi !== "") {
        $urls[] = rtrim($currentOriginApi, "/");
    }

    $currentProjectApi = getCurrentProjectApiBase();
    if ($currentProjectApi !== "") {
        $urls[] = rtrim($currentProjectApi, "/");
    }

    if ($fromEnv) {
        $parts = array_map("trim", explode(",", $fromEnv));
        foreach ($parts as $part) {
            if ($part !== "") {
                $urls[] = rtrim($part, "/");
            }
        }
    }

    foreach (DEFAULT_API_BASES as $base) {
        $urls[] = rtrim($base, "/");
    }

    $urls = array_values(array_unique($urls));
    return $urls;
}

function shouldTryNextBackend(bool $curlFailed, int $status): bool
{
    if ($curlFailed) {
        return true;
    }

    return in_array($status, [0, 404, 405, 500, 502, 503, 504], true);
}

function hasUploadedFiles(array $files): bool
{
    foreach ($files as $file) {
        if (!is_array($file) || !array_key_exists("error", $file)) {
            continue;
        }

        $error = $file["error"];
        if (is_array($error)) {
            foreach ($error as $entry) {
                if ((int) $entry === UPLOAD_ERR_OK) {
                    return true;
                }
            }
            continue;
        }

        if ((int) $error === UPLOAD_ERR_OK) {
            return true;
        }
    }

    return false;
}

function appendUploadedFileField(array &$payload, string $field, array $node, string $suffix = ""): void
{
    $name = $node["name"] ?? null;
    $type = $node["type"] ?? "application/octet-stream";
    $tmp = $node["tmp_name"] ?? null;
    $error = $node["error"] ?? UPLOAD_ERR_NO_FILE;

    if (is_array($name)) {
        foreach ($name as $key => $unused) {
            appendUploadedFileField($payload, $field, [
                "name" => $node["name"][$key] ?? null,
                "type" => $node["type"][$key] ?? "application/octet-stream",
                "tmp_name" => $node["tmp_name"][$key] ?? null,
                "error" => $node["error"][$key] ?? UPLOAD_ERR_NO_FILE,
            ], $suffix . "[" . $key . "]");
        }
        return;
    }

    if ((int) $error !== UPLOAD_ERR_OK || !is_string($tmp) || $tmp === "" || !is_file($tmp)) {
        return;
    }

    $targetField = $suffix === "" ? $field : ($field . $suffix);
    $payload[$targetField] = curl_file_create($tmp, (string) $type, (string) $name);
}

function buildMultipartBody(array $post, array $files): array
{
    $payload = $post;

    foreach ($files as $field => $fileNode) {
        if (!is_array($fileNode)) {
            continue;
        }
        appendUploadedFileField($payload, (string) $field, $fileNode);
    }

    return $payload;
}

function forwardRequest(string $method, string $path, $body = "", array $extraHeaders = [], bool $useSessionToken = true): array
{
    $method = strtoupper($method);
    $baseUrls = getBackendBaseUrls();
    $last = [
        "status" => 502,
        "body" => "{\"message\":\"មិនអាចភ្ជាប់ទៅ API បាន\"}",
        "contentType" => "application/json",
    ];

    foreach ($baseUrls as $base) {
        $url = rtrim($base, "/") . "/" . ltrim($path, "/");
        $ch = curl_init($url);
        if ($ch === false) {
            continue;
        }

        $headers = ["Accept: application/json"];
        $hasExplicitContentType = false;

        foreach ($extraHeaders as $name => $value) {
            if (strcasecmp((string) $name, "Content-Type") === 0) {
                $hasExplicitContentType = true;
            }
            $headers[] = $name . ": " . $value;
        }

        if (!is_array($body) && !$hasExplicitContentType && !empty($_SERVER["CONTENT_TYPE"])) {
            $headers[] = "Content-Type: " . $_SERVER["CONTENT_TYPE"];
        }

        if ($useSessionToken && !empty($_SESSION["auth_token"])) {
            $headers[] = "Authorization: Bearer " . $_SESSION["auth_token"];
        }

        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_HTTPHEADER => $headers,
        ]);

        if ($method !== "GET" && $method !== "HEAD") {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }

        $rawResponse = curl_exec($ch);
        $curlFailed = $rawResponse === false;
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        $contentType = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        $responseBody = $curlFailed ? "" : (string) substr((string) $rawResponse, $headerSize);
        curl_close($ch);

        if ($responseBody === "") {
            $responseBody = "{}";
        }

        $last = [
            "status" => $status > 0 ? $status : 502,
            "body" => $responseBody,
            "contentType" => $contentType ?: "application/json",
        ];

        if (!shouldTryNextBackend($curlFailed, $status)) {
            return $last;
        }
    }

    return $last;
}

function getInputData(): array
{
    $contentType = strtolower((string) ($_SERVER["CONTENT_TYPE"] ?? ""));
    if (strpos($contentType, "application/json") !== false) {
        $raw = file_get_contents("php://input");
        if (!is_string($raw) || $raw === "") {
            return [];
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }
    return $_POST;
}

function clearAuthSession(): void
{
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), "", time() - 42000, $params["path"], $params["domain"], (bool) $params["secure"], (bool) $params["httponly"]);
    }
    session_destroy();
}

$requestPath = trim((string) ($_GET["path"] ?? ""), "/");
$method = strtoupper((string) ($_SERVER["REQUEST_METHOD"] ?? "GET"));

if ($requestPath === "") {
    sendJson(404, ["message" => "API endpoint not found."]);
}

if ($requestPath === "login" && $method === "POST") {
    $input = getInputData();
    $username = trim((string) ($input["username"] ?? ""));
    $password = (string) ($input["password"] ?? "");

    if ($username === "" || $password === "") {
        sendJson(422, ["message" => "Username and password are required."]);
    }

    $payload = json_encode([
        "username" => $username,
        "password" => $password,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $result = forwardRequest("POST", "login", (string) $payload, ["Content-Type" => "application/json"], false);
    $status = (int) $result["status"];
    $body = (string) $result["body"];

    if ($status < 200 || $status >= 300) {
        http_response_code($status);
        header("Content-Type: application/json; charset=UTF-8");
        echo $body;
        exit;
    }

    $parsed = json_decode($body, true);
    $token = is_array($parsed) ? extractTokenFromPayload($parsed) : "";
    if ($token === "") {
        sendJson(502, ["message" => "មិនអាចភ្ជាប់ទៅ API បាន"]);
    }

    session_regenerate_id(true);
    $_SESSION["auth_token"] = $token;
    $_SESSION["token_type"] = (string) ($parsed["token_type"] ?? "Bearer");
    $_SESSION["auth_user"] = extractUserFromPayload($parsed);

    sendJson(200, [
        "authenticated" => true,
        "user" => $_SESSION["auth_user"],
    ]);
}

if ($requestPath === "logout" && $method === "POST") {
    if (!empty($_SESSION["auth_token"])) {
        forwardRequest("POST", "logout", "", ["Content-Type" => "application/json"], true);
    }
    clearAuthSession();
    sendJson(200, ["message" => "Logged out."]);
}

if ($requestPath === "me" && $method === "GET") {
    if (empty($_SESSION["auth_token"])) {
        sendJson(401, ["message" => "Unauthenticated."]);
    }

    $result = forwardRequest("GET", "me", "", [], true);
    $status = (int) $result["status"];
    $body = (string) $result["body"];

    if ($status >= 200 && $status < 300) {
        $parsed = json_decode($body, true);
        if (is_array($parsed)) {
            $user = extractUserFromPayload($parsed);
            if (!empty($user)) {
                $_SESSION["auth_user"] = $user;
            }
        }
        http_response_code($status);
        header("Content-Type: application/json; charset=UTF-8");
        echo $body;
        exit;
    }

    if (!empty($_SESSION["auth_user"])) {
        sendJson(200, [
            "authenticated" => true,
            "user" => $_SESSION["auth_user"],
            "source" => "session-cache",
        ]);
    }

    http_response_code($status > 0 ? $status : 401);
    header("Content-Type: application/json; charset=UTF-8");
    echo $body;
    exit;
}

if (empty($_SESSION["auth_token"])) {
    sendJson(401, ["message" => "Unauthenticated."]);
}

$contentType = strtolower((string) ($_SERVER["CONTENT_TYPE"] ?? ""));
$hasFiles = hasUploadedFiles($_FILES);

if ($method !== "GET" && $method !== "HEAD" && ($hasFiles || strpos($contentType, "multipart/form-data") !== false)) {
    $forwardBody = buildMultipartBody($_POST, $_FILES);
} else {
    $rawBody = file_get_contents("php://input");
    $forwardBody = is_string($rawBody) ? $rawBody : "";
}

$result = forwardRequest($method, $requestPath, $forwardBody, [], true);

http_response_code((int) $result["status"]);
header("Content-Type: " . $result["contentType"]);
echo (string) $result["body"];
exit;
