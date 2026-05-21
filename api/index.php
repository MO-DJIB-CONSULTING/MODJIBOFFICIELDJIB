<?php
declare(strict_types=1);

const DATA_DIR = __DIR__ . '/../private-data';
const DB_FILE = DATA_DIR . '/database.json';
const TOKENS_FILE = DATA_DIR . '/tokens.json';
const RESET_FILE = DATA_DIR . '/password-reset.json';
const ANALYTICS_FILE = DATA_DIR . '/analytics.json';
const DOCUMENT_DIR = DATA_DIR . '/documents';
const MEDIA_DIR = __DIR__ . '/../images/admin-uploads';
const SESSION_COOKIE = 'mo_admin_php';
const ADMIN_RESET_EMAIL = 'modjibconsulting@gmail.com';
const MAX_MEDIA_SIZE = 83886080;
const MAX_DOCUMENT_SIZE = 26214400;
const RESET_OTP_TTL = 600;

ensure_dirs();
start_secure_session();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = trim((string)($_GET['path'] ?? ''), '/');
$segments = $path === '' ? [] : array_values(array_filter(explode('/', $path), 'strlen'));

try {
    route_request($method, $segments);
} catch (Throwable $error) {
    error_log($error->getMessage());
    send_error(500, 'Erreur serveur.');
}

function ensure_dirs(): void {
    foreach ([DATA_DIR, DOCUMENT_DIR, MEDIA_DIR] as $dir) {
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
    }
}

function start_secure_session(): void {
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
    if (PHP_VERSION_ID >= 70300) {
        session_set_cookie_params([
            'lifetime' => 28800,
            'path' => '/',
            'secure' => $secure,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
    }
    session_name(SESSION_COOKIE);
    session_start();
}

function route_request(string $method, array $segments): void {
    if (($segments[0] ?? '') === 'health') {
        send_json(200, [
            'ok' => true,
            'db' => file_exists(DB_FILE),
            'generatedAt' => now_iso(),
            'runtime' => 'php'
        ]);
    }

    if (($segments[0] ?? '') === 'public') {
        if ($method === 'GET' && count($segments) === 1) {
            send_json(200, public_payload());
        }
        if ($method === 'GET' && ($segments[1] ?? '') === 'companies' && ($segments[2] ?? '') === 'search') {
            send_json(200, ['companies' => search_companies((string)($_GET['q'] ?? ''))]);
        }
        if (($segments[1] ?? '') === 'documents') {
            handle_public_documents($method, array_slice($segments, 1));
        }
    }

    if (($segments[0] ?? '') === 'analytics' && ($segments[1] ?? '') === 'visit' && $method === 'POST') {
        check_origin();
        record_analytics_event(read_json(16384));
        send_json(200, ['ok' => true]);
    }

    if (($segments[0] ?? '') === 'companies' && ($segments[1] ?? '') === 'search' && $method === 'GET') {
        send_json(200, ['companies' => search_companies((string)($_GET['q'] ?? ''))]);
    }

    if (($segments[0] ?? '') === 'documents') {
        handle_public_documents($method, $segments);
    }

    if (($segments[0] ?? '') === 'admin') {
        handle_admin($method, $segments);
    }

    send_error(404, 'Endpoint introuvable.');
}

function security_headers(): void {
    $csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' blob: data:; frame-src https://www.youtube.com https://www.youtube-nocookie.com; connect-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'; upgrade-insecure-requests";
    header("Content-Security-Policy: " . $csp);
    header("X-Content-Type-Options: nosniff");
    header("X-Frame-Options: SAMEORIGIN");
    header("Referrer-Policy: strict-origin-when-cross-origin");
    header("Permissions-Policy: camera=(), microphone=(), geolocation=()");
    header("Cross-Origin-Resource-Policy: same-origin");
    header("X-Permitted-Cross-Domain-Policies: none");
    header("Strict-Transport-Security: max-age=31536000; includeSubDomains");
}

function send_json(int $status, array $payload, array $headers = []): void {
    security_headers();
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    foreach ($headers as $key => $value) {
        header($key . ': ' . $value);
    }
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function send_error(int $status, string $message, array $headers = []): void {
    send_json($status, ['error' => $message], $headers);
}

function read_json(int $limit = 31457280): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    if (strlen($raw) > $limit) {
        send_error(413, 'Payload trop volumineux.');
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        send_error(400, 'JSON invalide.');
    }
    return $data;
}

function now_iso(): string {
    return gmdate('Y-m-d\TH:i:s.000\Z');
}

function text_value(mixed $value): string {
    return trim((string)($value ?? ''));
}

function safe_file_name(string $value): string {
    $name = preg_replace('/[^a-zA-Z0-9._-]+/', '-', text_value($value));
    $name = trim((string)$name, '-');
    return substr($name !== '' ? $name : ('file-' . time()), 0, 140);
}

function random_token(int $bytes = 24): string {
    return bin2hex(random_bytes($bytes));
}

function hash_access_code(string $code): string {
    return hash('sha256', strtoupper(text_value($code)));
}

function hash_admin_password(string $password, string $salt): string {
    return hash('sha256', $salt . ':' . $password);
}

function strong_password(string $password): bool {
    return strlen($password) >= 12
        && preg_match('/[A-Z]/', $password)
        && preg_match('/[a-z]/', $password)
        && preg_match('/[0-9]/', $password);
}

function password_policy_message(): string {
    return 'Le nouveau mot de passe doit contenir au moins 12 caracteres avec majuscule, minuscule et chiffre.';
}

function reset_otp_hash(string $email, string $otp): string {
    return hash('sha256', strtolower(text_value($email)) . ':' . text_value($otp));
}

function load_password_reset(): array {
    if (!file_exists(RESET_FILE)) {
        return [];
    }
    $data = json_decode((string)file_get_contents(RESET_FILE), true);
    if (!is_array($data)) {
        return [];
    }
    if ((int)($data['expiresAt'] ?? 0) < time()) {
        @unlink(RESET_FILE);
        return [];
    }
    return $data;
}

function save_password_reset(array $data): void {
    file_put_contents(RESET_FILE, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), LOCK_EX);
}

function send_admin_otp_email(string $otp): bool {
    $subject = 'Code OTP admin MO-DJIB Consulting';
    $message = "MO-DJIB Consulting - Recuperation admin\n\n"
        . "Code OTP: " . $otp . "\n"
        . "Validite: 10 minutes.\n\n"
        . "Si cette demande ne vient pas de vous, ignorez cet email et changez le mot de passe admin.";
    $headers = [
        'From: MO-DJIB Consulting <no-reply@modjibconsulting.online>',
        'Reply-To: modjibconsulting@gmail.com',
        'Content-Type: text/plain; charset=UTF-8'
    ];
    return @mail(ADMIN_RESET_EMAIL, $subject, $message, implode("\r\n", $headers));
}

function load_db(): array {
    if (!file_exists(DB_FILE)) {
        $salt = random_token(16);
        return [
            'admin' => [
                'email' => 'admin@modjibconsulting.com',
                'password_salt' => $salt,
                'password_hash' => hash_admin_password('ChangeMoi2026!', $salt)
            ],
            'content' => [],
            'services' => [],
            'pricing' => [],
            'posts' => [],
            'gallery' => [],
            'companies' => [],
            'documents' => [],
            'auditLogs' => []
        ];
    }
    $json = file_get_contents(DB_FILE);
    $db = json_decode($json ?: '{}', true);
    return is_array($db) ? $db : [];
}

function save_db(array $db): void {
    file_put_contents(DB_FILE, json_encode($db, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), LOCK_EX);
}

function public_payload(): array {
    $db = load_db();
    return [
        'generatedAt' => now_iso(),
        'content' => $db['content'] ?? [],
        'services' => sorted_items($db['services'] ?? [], 'sort_order'),
        'pricing' => sorted_items($db['pricing'] ?? [], 'sort_order'),
        'posts' => array_slice(public_posts($db['posts'] ?? []), 0, 6),
        'gallery' => public_gallery($db['gallery'] ?? []),
        'companies' => array_slice(public_companies($db['companies'] ?? []), 0, 8),
        'documents' => public_documents($db['documents'] ?? [])
    ];
}

function sorted_items(array $items, string $field): array {
    usort($items, fn($a, $b) => (int)($a[$field] ?? 0) <=> (int)($b[$field] ?? 0) ?: (int)($a['id'] ?? 0) <=> (int)($b['id'] ?? 0));
    return array_values($items);
}

function public_posts(array $posts): array {
    $posts = array_values(array_filter($posts, fn($post) => ($post['status'] ?? 'published') === 'published'));
    usort($posts, fn($a, $b) => strcmp((string)($b['published_at'] ?? ''), (string)($a['published_at'] ?? '')));
    return $posts;
}

function public_gallery(array $items): array {
    return sorted_items(array_values(array_filter($items, fn($item) => ($item['status'] ?? 'published') === 'published')), 'sort_order');
}

function public_companies(array $companies): array {
    $items = array_values(array_filter($companies, fn($company) => ($company['status'] ?? '') !== 'Suspendue'));
    usort($items, fn($a, $b) => strcmp((string)($b['updated_at'] ?? ''), (string)($a['updated_at'] ?? '')));
    return $items;
}

function public_documents(array $documents): array {
    $items = array_values(array_filter($documents, fn($doc) => ($doc['status'] ?? '') === 'active'));
    usort($items, fn($a, $b) => strcmp((string)($b['uploaded_at'] ?? ''), (string)($a['uploaded_at'] ?? '')));
    return array_map('public_document', $items);
}

function public_document(array $doc): array {
    return [
        'id' => $doc['id'] ?? null,
        'title' => $doc['title'] ?? '',
        'description' => $doc['description'] ?? '',
        'category' => $doc['category'] ?? 'Document',
        'original_filename' => $doc['original_filename'] ?? '',
        'size' => $doc['size'] ?? 0,
        'status' => $doc['status'] ?? '',
        'uploaded_at' => $doc['uploaded_at'] ?? '',
        'updated_at' => $doc['updated_at'] ?? ''
    ];
}

function search_companies(string $query): array {
    $q = strtolower(text_value($query));
    $companies = public_companies(load_db()['companies'] ?? []);
    if ($q === '') {
        return array_slice($companies, 0, 50);
    }
    return array_values(array_slice(array_filter($companies, function ($company) use ($q) {
        return str_contains(strtolower((string)($company['name'] ?? '')), $q)
            || str_contains(strtolower((string)($company['certificate_number'] ?? '')), $q);
    }), 0, 50));
}

function analytics_source(string $referrer): string {
    $value = text_value($referrer);
    if ($value === '') {
        return 'Direct';
    }
    $host = strtolower((string)(parse_url($value, PHP_URL_HOST) ?: ''));
    $host = preg_replace('/^www\./', '', $host);
    if ($host === '') {
        return 'Direct';
    }
    if (str_contains($host, 'google')) return 'Google';
    if (str_contains($host, 'bing')) return 'Bing';
    if (str_contains($host, 'facebook') || str_contains($host, 'instagram')) return 'Meta';
    if (str_contains($host, 'linkedin')) return 'LinkedIn';
    if (str_contains($host, 'wa.me') || str_contains($host, 'whatsapp')) return 'WhatsApp';
    if (str_contains($host, 'modjibconsulting.online')) return 'Interne';
    return substr($host, 0, 60);
}

function analytics_device(string $userAgent, string $viewport): string {
    $agent = strtolower($userAgent);
    $width = (int)explode('x', $viewport)[0];
    if (preg_match('/mobile|android|iphone|ipod/', $agent) || ($width > 0 && $width < 700)) return 'mobile';
    if (preg_match('/ipad|tablet/', $agent) || ($width >= 700 && $width < 1050)) return 'tablet';
    return 'desktop';
}

function load_analytics(): array {
    if (!file_exists(ANALYTICS_FILE)) {
        return [];
    }
    $data = json_decode((string)file_get_contents(ANALYTICS_FILE), true);
    return is_array($data) ? $data : [];
}

function save_analytics(array $events): void {
    $events = array_slice($events, -5000);
    file_put_contents(ANALYTICS_FILE, json_encode($events, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), LOCK_EX);
}

function record_analytics_event(array $body): void {
    $events = load_analytics();
    $visitorSeed = text_value($body['visitorId'] ?? ($_SERVER['REMOTE_ADDR'] ?? 'visitor'));
    $sessionSeed = text_value($body['sessionId'] ?? $visitorSeed);
    $referrer = substr(text_value($body['referrer'] ?? ''), 0, 240);
    $viewport = substr(text_value($body['viewport'] ?? ''), 0, 24);
    $userAgent = substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 240);
    $path = preg_replace('/^https?:\/\/[^\/]+/i', '', text_value($body['path'] ?? '/'));
    $events[] = [
        'id' => count($events) + 1,
        'event_type' => in_array($body['eventType'] ?? '', ['page_view', 'chat_open', 'certificate_search'], true) ? $body['eventType'] : 'page_view',
        'visitor_id' => substr(hash('sha256', $visitorSeed), 0, 32),
        'session_id' => substr(hash('sha256', $sessionSeed), 0, 32),
        'path' => substr($path !== '' ? $path : '/', 0, 180),
        'title' => substr(text_value($body['title'] ?? ''), 0, 180),
        'referrer' => $referrer,
        'source' => analytics_source($referrer),
        'language' => substr(text_value($body['language'] ?? 'fr'), 0, 12),
        'device' => analytics_device($userAgent, $viewport),
        'viewport' => $viewport,
        'created_at' => now_iso()
    ];
    save_analytics($events);
}

function count_group(array $events, string $field, int $limit = 8): array {
    $counts = [];
    foreach ($events as $event) {
        if (($event['event_type'] ?? 'page_view') !== 'page_view') continue;
        $label = (string)($event[$field] ?? '');
        if ($label === '') $label = 'Inconnu';
        $counts[$label] = ($counts[$label] ?? 0) + 1;
    }
    arsort($counts);
    $items = [];
    foreach (array_slice($counts, 0, $limit, true) as $label => $count) {
        $items[] = ['label' => $label, 'count' => $count];
    }
    return $items;
}

function analytics_summary(): array {
    $cutoff = time() - 30 * 86400;
    $events = array_values(array_filter(load_analytics(), function ($event) use ($cutoff) {
        return strtotime((string)($event['created_at'] ?? '')) >= $cutoff;
    }));
    $pageViews = array_values(array_filter($events, fn($event) => ($event['event_type'] ?? 'page_view') === 'page_view'));
    $today = gmdate('Y-m-d');
    $todayViews = array_values(array_filter($pageViews, fn($event) => substr((string)($event['created_at'] ?? ''), 0, 10) === $today));
    return [
        'rangeDays' => 30,
        'totals' => [
            'pageViews' => count($pageViews),
            'visitors' => count(array_unique(array_column($pageViews, 'visitor_id'))),
            'sessions' => count(array_unique(array_column($pageViews, 'session_id')))
        ],
        'today' => [
            'pageViews' => count($todayViews),
            'visitors' => count(array_unique(array_column($todayViews, 'visitor_id')))
        ],
        'topPages' => count_group($pageViews, 'path'),
        'sources' => count_group($pageViews, 'source'),
        'languages' => count_group($pageViews, 'language'),
        'devices' => count_group($pageViews, 'device'),
        'recent' => array_slice(array_reverse($pageViews), 0, 20)
    ];
}

function handle_public_documents(string $method, array $segments): void {
    if ($method === 'GET' && count($segments) === 1) {
        send_json(200, ['documents' => public_documents(load_db()['documents'] ?? [])]);
    }
    $id = (int)($segments[1] ?? 0);
    $db = load_db();
    $doc = find_by_id($db['documents'] ?? [], $id);
    if (!$doc || ($doc['status'] ?? '') !== 'active') {
        send_error(404, 'Document introuvable.');
    }
    if ($method === 'POST' && ($segments[2] ?? '') === 'verify') {
        $body = read_json();
        if (hash_access_code((string)($body['code'] ?? '')) !== ($doc['code_hash'] ?? '')) {
            audit('document_code_refuse', 'document:' . $id, ['title' => $doc['title'] ?? ''], 'public');
            send_error(403, 'Code incorrect.');
        }
        $token = random_token();
        $tokens = load_tokens();
        $tokens[$token] = ['id' => $id, 'expiresAt' => time() + 600];
        save_tokens($tokens);
        audit('document_code_valide', 'document:' . $id, ['title' => $doc['title'] ?? ''], 'public');
        send_json(200, ['ok' => true, 'downloadUrl' => '/api/documents/' . $id . '/download?token=' . $token]);
    }
    if ($method === 'GET' && ($segments[2] ?? '') === 'download') {
        $token = (string)($_GET['token'] ?? '');
        $tokens = load_tokens();
        $access = $tokens[$token] ?? null;
        if (!$access || (int)$access['id'] !== $id || (int)$access['expiresAt'] < time()) {
            send_error(403, 'Lien expire ou invalide.');
        }
        unset($tokens[$token]);
        save_tokens($tokens);
        $filePath = DOCUMENT_DIR . '/' . safe_file_name((string)($doc['stored_filename'] ?? ''));
        if (!is_file($filePath)) {
            send_error(404, 'Fichier introuvable.');
        }
        audit('document_telecharge', 'document:' . $id, ['title' => $doc['title'] ?? ''], 'public');
        security_headers();
        header('Content-Type: ' . (($doc['mime_type'] ?? '') ?: 'application/octet-stream'));
        header('Content-Disposition: attachment; filename="' . rawurlencode((string)($doc['original_filename'] ?? 'document')) . '"');
        header('Cache-Control: no-store');
        readfile($filePath);
        exit;
    }
    send_error(404, 'Endpoint introuvable.');
}

function load_tokens(): array {
    if (!file_exists(TOKENS_FILE)) {
        return [];
    }
    $tokens = json_decode((string)file_get_contents(TOKENS_FILE), true);
    if (!is_array($tokens)) {
        return [];
    }
    foreach ($tokens as $token => $access) {
        if ((int)($access['expiresAt'] ?? 0) < time()) {
            unset($tokens[$token]);
        }
    }
    return $tokens;
}

function save_tokens(array $tokens): void {
    file_put_contents(TOKENS_FILE, json_encode($tokens, JSON_PRETTY_PRINT), LOCK_EX);
}

function handle_admin(string $method, array $segments): void {
    check_origin();
    if ($method === 'POST' && ($segments[1] ?? '') === 'password' && ($segments[2] ?? '') === 'request-reset') {
        handle_password_reset_request();
    }
    if ($method === 'POST' && ($segments[1] ?? '') === 'password' && ($segments[2] ?? '') === 'reset') {
        handle_password_reset_confirm();
    }
    if ($method === 'POST' && ($segments[1] ?? '') === 'login') {
        $body = read_json();
        $db = load_db();
        $admin = $db['admin'] ?? [];
        $email = strtolower(text_value($body['email'] ?? ''));
        $salt = (string)($admin['password_salt'] ?? '');
        $hash = hash_admin_password((string)($body['password'] ?? ''), $salt);
        if ($email !== strtolower((string)($admin['email'] ?? '')) || !hash_equals((string)($admin['password_hash'] ?? ''), $hash)) {
            audit('connexion_refusee', 'admin', ['email' => $email], $email);
            send_error(401, 'Identifiants invalides.');
        }
        session_regenerate_id(true);
        $_SESSION['admin'] = ['email' => $admin['email'], 'role' => 'admin'];
        audit('connexion_reussie', 'admin', ['email' => $admin['email']], $admin['email']);
        send_json(200, ['ok' => true, 'user' => ['email' => $admin['email'], 'role' => 'admin']]);
    }
    if ($method === 'POST' && ($segments[1] ?? '') === 'logout') {
        $_SESSION = [];
        session_destroy();
        send_json(200, ['ok' => true]);
    }
    $admin = require_admin();
    $resource = $segments[1] ?? '';

    if ($method === 'GET' && $resource === 'dashboard') {
        $db = load_db();
        send_json(200, dashboard_payload($db, $admin));
    }
    if ($method === 'GET' && $resource === 'audit-logs') {
        send_json(200, ['ok' => true, 'auditLogs' => array_slice(load_db()['auditLogs'] ?? [], 0, 120)]);
    }
    if ($method === 'GET' && $resource === 'export') {
        $body = json_encode(load_db(), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        audit('export_json', 'database', [], $admin['email']);
        security_headers();
        header('Content-Type: application/json; charset=utf-8');
        header('Content-Disposition: attachment; filename="mo-djib-backup-' . gmdate('Y-m-d') . '.json"');
        header('Cache-Control: no-store');
        echo $body;
        exit;
    }
    if ($method === 'PUT' && $resource === 'content') {
        $body = read_json();
        $db = load_db();
        foreach (($body['content'] ?? $body) as $key => $value) {
            $db['content'][$key] = (string)$value;
        }
        $db['content']['lastContentUpdate'] = now_iso();
        save_db($db);
        audit('contenu_modifie', 'site_content', ['keys' => array_keys($body['content'] ?? $body)], $admin['email']);
        send_json(200, ['ok' => true, 'content' => load_db()['content'] ?? []]);
    }
    if ($resource === 'security' && ($segments[2] ?? '') === 'password' && $method === 'PUT') {
        handle_password_update($admin);
    }
    if ($resource === 'media') {
        handle_media($method, $segments, $admin);
    }
    if (in_array($resource, ['services', 'pricing', 'gallery', 'blog', 'companies', 'documents'], true)) {
        handle_collection($resource, $method, $segments, $admin);
    }
    send_error(404, 'Endpoint introuvable.');
}

function check_origin(): void {
    if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', ['POST', 'PUT', 'DELETE'], true)) {
        return;
    }
    $origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($origin === '') {
        return;
    }
    $host = (string)($_SERVER['HTTP_HOST'] ?? '');
    if ($origin !== 'http://' . $host && $origin !== 'https://' . $host) {
        send_error(403, 'Origine non autorisee.');
    }
}

function require_admin(): array {
    if (!isset($_SESSION['admin']) || !is_array($_SESSION['admin'])) {
        send_error(401, 'Connexion administrateur requise.');
    }
    return $_SESSION['admin'];
}

function dashboard_payload(array $db, array $admin): array {
    $stats = [
        'posts' => count($db['posts'] ?? []),
        'companies' => count($db['companies'] ?? []),
        'documents' => count($db['documents'] ?? []),
        'services' => count($db['services'] ?? []),
        'pricing' => count($db['pricing'] ?? []),
        'gallery' => count($db['gallery'] ?? []),
        'media' => count(media_files())
    ];
    return [
        'user' => $admin,
        'stats' => $stats,
        'content' => $db['content'] ?? [],
        'services' => sorted_items($db['services'] ?? [], 'sort_order'),
        'pricing' => sorted_items($db['pricing'] ?? [], 'sort_order'),
        'posts' => $db['posts'] ?? [],
        'gallery' => sorted_items($db['gallery'] ?? [], 'sort_order'),
        'companies' => $db['companies'] ?? [],
        'documents' => array_map('public_document', $db['documents'] ?? []),
        'media' => media_files(),
        'auditLogs' => array_slice($db['auditLogs'] ?? [], 0, 80),
        'analytics' => analytics_summary()
    ];
}

function handle_password_reset_request(): void {
    $body = read_json();
    $email = strtolower(text_value($body['email'] ?? ''));
    $db = load_db();
    $admin = $db['admin'] ?? [];
    if ($email !== '' && $email === strtolower((string)($admin['email'] ?? ''))) {
        $otp = (string)random_int(100000, 999999);
        $sent = send_admin_otp_email($otp);
        if (!$sent) {
            audit('otp_mot_de_passe_email_echec', 'admin', ['resetEmail' => ADMIN_RESET_EMAIL], $email);
            send_error(500, "L'envoi email est indisponible. Verifiez la configuration email de l'hebergement.");
        }
        save_password_reset([
            'email' => $email,
            'hash' => reset_otp_hash($email, $otp),
            'expiresAt' => time() + RESET_OTP_TTL,
            'attempts' => 0,
            'createdAt' => now_iso()
        ]);
        audit('otp_mot_de_passe_envoye', 'admin', ['resetEmail' => ADMIN_RESET_EMAIL], $email);
    } else {
        audit('otp_mot_de_passe_ignore', 'admin', ['email' => $email], $email);
    }
    send_json(200, [
        'ok' => true,
        'message' => "Si le compte existe, un OTP vient d'etre envoye a l'email de securite."
    ]);
}

function handle_password_reset_confirm(): void {
    $body = read_json();
    $email = strtolower(text_value($body['email'] ?? ''));
    $otp = text_value($body['otp'] ?? '');
    $new = (string)($body['newPassword'] ?? '');
    $db = load_db();
    $admin = $db['admin'] ?? [];
    $reset = load_password_reset();
    if ($email === '' || $email !== strtolower((string)($admin['email'] ?? '')) || empty($reset) || ($reset['email'] ?? '') !== $email) {
        send_error(400, 'OTP expire ou invalide. Demandez un nouveau code.');
    }
    if (!strong_password($new)) {
        send_error(422, password_policy_message());
    }
    if (!preg_match('/^[0-9]{6}$/', $otp) || !hash_equals((string)($reset['hash'] ?? ''), reset_otp_hash($email, $otp))) {
        $reset['attempts'] = (int)($reset['attempts'] ?? 0) + 1;
        if ($reset['attempts'] >= 5) {
            @unlink(RESET_FILE);
        } else {
            save_password_reset($reset);
        }
        audit('otp_mot_de_passe_refuse', 'admin', [], $email);
        send_error(403, 'OTP incorrect.');
    }
    $salt = random_token(16);
    $db['admin']['password_salt'] = $salt;
    $db['admin']['password_hash'] = hash_admin_password($new, $salt);
    $db['content']['adminPasswordManagedAt'] = now_iso();
    save_db($db);
    @unlink(RESET_FILE);
    $_SESSION = [];
    session_destroy();
    audit('mot_de_passe_reinitialise_otp', 'admin', [], $email);
    send_json(200, ['ok' => true, 'message' => 'Mot de passe reinitialise.']);
}

function handle_password_update(array $adminUser): void {
    $body = read_json();
    $db = load_db();
    $admin = $db['admin'] ?? [];
    $current = hash_admin_password((string)($body['currentPassword'] ?? ''), (string)($admin['password_salt'] ?? ''));
    if (!hash_equals((string)($admin['password_hash'] ?? ''), $current)) {
        send_error(403, 'Mot de passe actuel incorrect.');
    }
    $new = (string)($body['newPassword'] ?? '');
    if (!strong_password($new)) {
        send_error(422, password_policy_message());
    }
    $salt = random_token(16);
    $db['admin']['password_salt'] = $salt;
    $db['admin']['password_hash'] = hash_admin_password($new, $salt);
    save_db($db);
    audit('mot_de_passe_modifie', 'admin', [], $adminUser['email']);
    send_json(200, ['ok' => true, 'message' => 'Mot de passe mis a jour.']);
}

function handle_media(string $method, array $segments, array $admin): void {
    if ($method === 'GET') {
        send_json(200, ['ok' => true, 'media' => media_files()]);
    }
    if ($method === 'POST') {
        $body = read_json(MAX_MEDIA_SIZE * 2);
        $original = safe_file_name((string)($body['fileName'] ?? 'media'));
        $mime = text_value($body['mimeType'] ?? '');
        if (!allowed_media($original, $mime)) {
            send_error(422, 'Media invalide.');
        }
        $bytes = decode_base64((string)($body['base64'] ?? ''), MAX_MEDIA_SIZE);
        $ext = strtolower(pathinfo($original, PATHINFO_EXTENSION));
        $base = pathinfo($original, PATHINFO_FILENAME) ?: 'media';
        $stored = time() . '-' . substr(random_token(5), 0, 10) . '-' . safe_file_name($base) . '.' . $ext;
        file_put_contents(MEDIA_DIR . '/' . $stored, $bytes, LOCK_EX);
        audit('media_ajoute', $stored, ['size' => strlen($bytes)], $admin['email']);
        send_json(201, [
            'ok' => true,
            'file' => ['name' => $stored, 'url' => 'images/admin-uploads/' . $stored, 'media_type' => media_type($stored), 'size' => strlen($bytes), 'updated_at' => now_iso()],
            'media' => media_files()
        ]);
    }
    if ($method === 'DELETE' && isset($segments[2])) {
        $file = safe_file_name((string)$segments[2]);
        $target = MEDIA_DIR . '/' . $file;
        if (is_file($target)) {
            unlink($target);
        }
        audit('media_supprime', $file, [], $admin['email']);
        send_json(200, ['ok' => true, 'media' => media_files()]);
    }
    send_error(405, 'Methode non autorisee.');
}

function media_files(): array {
    if (!is_dir(MEDIA_DIR)) {
        return [];
    }
    $items = [];
    foreach (scandir(MEDIA_DIR) ?: [] as $name) {
        if ($name === '.' || $name === '..' || !is_file(MEDIA_DIR . '/' . $name)) {
            continue;
        }
        $items[] = [
            'name' => $name,
            'url' => 'images/admin-uploads/' . $name,
            'media_type' => media_type($name),
            'size' => filesize(MEDIA_DIR . '/' . $name),
            'updated_at' => gmdate('c', filemtime(MEDIA_DIR . '/' . $name))
        ];
    }
    usort($items, fn($a, $b) => strcmp((string)$b['updated_at'], (string)$a['updated_at']));
    return $items;
}

function media_type(string $file): string {
    $lower = strtolower($file);
    if (str_contains($lower, 'youtube.com') || str_contains($lower, 'youtu.be')) return 'youtube';
    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    return in_array($ext, ['mp4', 'webm', 'ogg', 'mov'], true) ? 'video' : 'image';
}

function allowed_media(string $file, string $mime): bool {
    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    return in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'ogg', 'mov'], true);
}

function allowed_document(string $file): bool {
    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    return in_array($ext, ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'jpg', 'jpeg', 'png', 'webp', 'zip'], true);
}

function decode_base64(string $base64, int $limit): string {
    $clean = preg_replace('/^data:[^;]+;base64,/', '', text_value($base64));
    if ($clean === '' || !preg_match('/^[A-Za-z0-9+\/]+={0,2}$/', $clean)) {
        send_error(422, 'Fichier invalide.');
    }
    $bytes = base64_decode($clean, true);
    if ($bytes === false || strlen($bytes) === 0 || strlen($bytes) > $limit) {
        send_error(422, 'Fichier invalide ou trop volumineux.');
    }
    return $bytes;
}

function handle_collection(string $resource, string $method, array $segments, array $admin): void {
    $map = [
        'services' => ['key' => 'services', 'list' => 'services'],
        'pricing' => ['key' => 'pricing', 'list' => 'pricing'],
        'gallery' => ['key' => 'gallery', 'list' => 'gallery'],
        'blog' => ['key' => 'posts', 'list' => 'posts'],
        'companies' => ['key' => 'companies', 'list' => 'companies'],
        'documents' => ['key' => 'documents', 'list' => 'documents']
    ];
    $key = $map[$resource]['key'];
    if ($resource === 'companies' && $method === 'POST' && ($segments[2] ?? '') === 'import') {
        handle_company_import($admin);
    }
    $db = load_db();
    $db[$key] = $db[$key] ?? [];
    if ($method === 'POST') {
        $item = build_item($resource, read_json($resource === 'documents' ? MAX_DOCUMENT_SIZE * 2 : 31457280), null);
        $item['id'] = next_id($db[$key]);
        $db[$key][] = $item;
        save_db($db);
        audit($resource . '_ajoute', $resource . ':' . $item['id'], ['title' => $item['title'] ?? $item['name'] ?? ''], $admin['email']);
        send_json(201, ['ok' => true, $map[$resource]['list'] => response_list($resource, load_db()[$key] ?? [])]);
    }
    if ($method === 'PUT' && isset($segments[2])) {
        $id = (int)$segments[2];
        foreach ($db[$key] as $index => $current) {
            if ((int)($current['id'] ?? 0) === $id) {
                $db[$key][$index] = build_item($resource, read_json($resource === 'documents' ? MAX_DOCUMENT_SIZE * 2 : 31457280), $current);
                $db[$key][$index]['id'] = $id;
                save_db($db);
                audit($resource . '_modifie', $resource . ':' . $id, [], $admin['email']);
                send_json(200, ['ok' => true, $map[$resource]['list'] => response_list($resource, load_db()[$key] ?? [])]);
            }
        }
        send_error(404, 'Element introuvable.');
    }
    if ($method === 'DELETE' && isset($segments[2])) {
        $id = (int)$segments[2];
        if ($resource === 'documents') {
            $doc = find_by_id($db[$key], $id);
            if ($doc && !empty($doc['stored_filename']) && is_file(DOCUMENT_DIR . '/' . safe_file_name((string)$doc['stored_filename']))) {
                unlink(DOCUMENT_DIR . '/' . safe_file_name((string)$doc['stored_filename']));
            }
        }
        $db[$key] = array_values(array_filter($db[$key], fn($item) => (int)($item['id'] ?? 0) !== $id));
        save_db($db);
        audit($resource . '_supprime', $resource . ':' . $id, [], $admin['email']);
        send_json(200, ['ok' => true, $map[$resource]['list'] => response_list($resource, load_db()[$key] ?? [])]);
    }
    send_error(405, 'Methode non autorisee.');
}

function build_item(string $resource, array $body, ?array $current): array {
    $stamp = now_iso();
    if ($resource === 'services') {
        return [
            'id' => $current['id'] ?? null,
            'eyebrow' => text_value($body['eyebrow'] ?? ''),
            'title' => text_value($body['title'] ?? $current['title'] ?? ''),
            'description' => text_value($body['description'] ?? ''),
            'features' => lines($body['features'] ?? []),
            'icon' => text_value($body['icon'] ?? $current['icon'] ?? 'clipboard-check'),
            'sort_order' => (int)($body['sort_order'] ?? 0)
        ];
    }
    if ($resource === 'pricing') {
        return [
            'id' => $current['id'] ?? null,
            'title' => text_value($body['title'] ?? $current['title'] ?? ''),
            'price' => text_value($body['price'] ?? 'Sur devis'),
            'description' => text_value($body['description'] ?? ''),
            'features' => lines($body['features'] ?? []),
            'highlighted' => in_array($body['highlighted'] ?? 0, ['1', 1, true], true),
            'sort_order' => (int)($body['sort_order'] ?? 0)
        ];
    }
    if ($resource === 'gallery') {
        $image = text_value($body['image'] ?? $current['image'] ?? '');
        $type = text_value($body['media_type'] ?? media_type($image)) ?: media_type($image);
        if (!in_array($type, ['image', 'video', 'youtube'], true)) {
            $type = media_type($image);
        }
        return [
            'id' => $current['id'] ?? null,
            'title' => text_value($body['title'] ?? $current['title'] ?? ''),
            'description' => text_value($body['description'] ?? ''),
            'image' => $image,
            'media_type' => $type,
            'status' => ($body['status'] ?? '') === 'draft' ? 'draft' : 'published',
            'sort_order' => (int)($body['sort_order'] ?? 0),
            'created_at' => $current['created_at'] ?? $stamp,
            'updated_at' => $stamp
        ];
    }
    if ($resource === 'blog') {
        $title = text_value($body['title'] ?? $current['title'] ?? '');
        return [
            'id' => $current['id'] ?? null,
            'title' => $title,
            'slug' => slugify($body['slug'] ?? $title),
            'excerpt' => text_value($body['excerpt'] ?? ''),
            'content' => text_value($body['content'] ?? ''),
            'image' => text_value($body['image'] ?? ''),
            'category' => text_value($body['category'] ?? 'Actualite'),
            'status' => ($body['status'] ?? '') === 'draft' ? 'draft' : 'published',
            'published_at' => text_value($body['published_at'] ?? $current['published_at'] ?? $stamp),
            'updated_at' => $stamp
        ];
    }
    if ($resource === 'companies') {
        return [
            'id' => $current['id'] ?? null,
            'name' => text_value($body['name'] ?? $current['name'] ?? ''),
            'certificate_number' => strtoupper(text_value($body['certificate_number'] ?? $current['certificate_number'] ?? '')),
            'status' => company_status($body['status'] ?? 'Certifiee'),
            'sector' => text_value($body['sector'] ?? ''),
            'issued_at' => text_value($body['issued_at'] ?? ''),
            'expires_at' => text_value($body['expires_at'] ?? ''),
            'certificate_url' => text_value($body['certificate_url'] ?? ''),
            'notes' => text_value($body['notes'] ?? ''),
            'updated_at' => $stamp
        ];
    }
    if ($resource === 'documents') {
        return build_document($body, $current);
    }
    return [];
}

function build_document(array $body, ?array $current): array {
    $stamp = now_iso();
    $stored = $current['stored_filename'] ?? '';
    $original = $current['original_filename'] ?? '';
    $mime = $current['mime_type'] ?? 'application/octet-stream';
    $size = (int)($current['size'] ?? 0);
    if (!empty($body['base64'])) {
        $original = safe_file_name((string)($body['fileName'] ?? $body['original_filename'] ?? $original));
        if (!allowed_document($original)) {
            send_error(422, 'Type de document refuse.');
        }
        $bytes = decode_base64((string)$body['base64'], MAX_DOCUMENT_SIZE);
        $ext = pathinfo($original, PATHINFO_EXTENSION) ?: 'bin';
        $stored = time() . '-' . substr(random_token(8), 0, 16) . '.' . strtolower($ext);
        file_put_contents(DOCUMENT_DIR . '/' . $stored, $bytes, LOCK_EX);
        if ($current && !empty($current['stored_filename'])) {
            $old = DOCUMENT_DIR . '/' . safe_file_name((string)$current['stored_filename']);
            if (is_file($old)) {
                unlink($old);
            }
        }
        $mime = text_value($body['mimeType'] ?? 'application/octet-stream');
        $size = strlen($bytes);
    } elseif (!$current) {
        send_error(422, 'Fichier requis.');
    }
    $codeHash = $current['code_hash'] ?? '';
    if (!empty($body['code'])) {
        $codeHash = hash_access_code((string)$body['code']);
    } elseif (!$current) {
        send_error(422, 'Code d acces requis.');
    }
    return [
        'id' => $current['id'] ?? null,
        'title' => text_value($body['title'] ?? $current['title'] ?? ''),
        'description' => text_value($body['description'] ?? ''),
        'category' => text_value($body['category'] ?? 'Document'),
        'original_filename' => $original,
        'stored_filename' => $stored,
        'mime_type' => $mime,
        'size' => $size,
        'code_hash' => $codeHash,
        'status' => ($body['status'] ?? '') === 'inactive' ? 'inactive' : 'active',
        'uploaded_at' => $current['uploaded_at'] ?? $stamp,
        'updated_at' => $stamp
    ];
}

function lines(mixed $value): array {
    if (is_array($value)) {
        return array_values(array_filter(array_map('text_value', $value)));
    }
    return array_values(array_filter(array_map('text_value', preg_split('/\r?\n/', (string)$value) ?: [])));
}

function slugify(mixed $value): string {
    $slug = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', text_value($value)) ?: '');
    $slug = trim($slug, '-');
    return $slug !== '' ? substr($slug, 0, 90) : ('post-' . time());
}

function company_status(mixed $value): string {
    $status = text_value($value);
    return in_array($status, ['Certifiee', 'Referencee', 'En audit', 'Suspendue'], true) ? $status : 'Certifiee';
}

function response_list(string $resource, array $items): array {
    if ($resource === 'documents') {
        return array_map('public_document', $items);
    }
    if (in_array($resource, ['services', 'pricing', 'gallery'], true)) {
        return sorted_items($items, 'sort_order');
    }
    return array_values($items);
}

function handle_company_import(array $admin): void {
    $body = read_json();
    $rows = preg_split('/\r?\n/', text_value($body['text'] ?? '')) ?: [];
    $db = load_db();
    $db['companies'] = $db['companies'] ?? [];
    $count = 0;
    foreach ($rows as $line) {
        $line = trim($line);
        if ($line === '' || preg_match('/nom|societe|certificat/i', $line)) {
            continue;
        }
        $separator = str_contains($line, ';') ? ';' : (str_contains($line, "\t") ? "\t" : ',');
        $cols = array_map('text_value', explode($separator, $line));
        if (empty($cols[0]) || empty($cols[1])) {
            continue;
        }
        $company = [
            'name' => $cols[0],
            'certificate_number' => strtoupper($cols[1]),
            'status' => company_status($cols[2] ?? 'Certifiee'),
            'sector' => $cols[3] ?? '',
            'issued_at' => $cols[4] ?? '',
            'expires_at' => $cols[5] ?? '',
            'certificate_url' => '',
            'notes' => $cols[6] ?? '',
            'updated_at' => now_iso()
        ];
        $found = false;
        foreach ($db['companies'] as $index => $existing) {
            if (($existing['certificate_number'] ?? '') === $company['certificate_number']) {
                $company['id'] = $existing['id'];
                $db['companies'][$index] = array_merge($existing, $company);
                $found = true;
                break;
            }
        }
        if (!$found) {
            $company['id'] = next_id($db['companies']);
            $db['companies'][] = $company;
        }
        $count++;
    }
    if ($count === 0) {
        send_error(422, 'Aucune societe valide trouvee dans l import.');
    }
    save_db($db);
    audit('societes_importees', 'companies', ['count' => $count], $admin['email']);
    send_json(200, ['ok' => true, 'imported' => $count, 'companies' => load_db()['companies'] ?? []]);
}

function next_id(array $items): int {
    $max = 0;
    foreach ($items as $item) {
        $max = max($max, (int)($item['id'] ?? 0));
    }
    return $max + 1;
}

function find_by_id(array $items, int $id): ?array {
    foreach ($items as $item) {
        if ((int)($item['id'] ?? 0) === $id) {
            return $item;
        }
    }
    return null;
}

function audit(string $action, string $target, array $details = [], string $actor = ''): void {
    $db = load_db();
    $db['auditLogs'] = $db['auditLogs'] ?? [];
    array_unshift($db['auditLogs'], [
        'id' => next_id($db['auditLogs']),
        'actor' => $actor,
        'action' => $action,
        'target' => $target,
        'details' => $details,
        'ip' => (string)($_SERVER['REMOTE_ADDR'] ?? ''),
        'created_at' => now_iso()
    ]);
    $db['auditLogs'] = array_slice($db['auditLogs'], 0, 300);
    save_db($db);
}
