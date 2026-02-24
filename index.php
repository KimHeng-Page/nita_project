<!DOCTYPE html>
<html lang="en" ng-app="loginApp">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/png" href="images/usea.png">
    <title>USEA | Login</title>
    <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.2.32/angular.min.js"></script>
    <style>
        :root {
            --bg: #f2f4f8;
            --card-bg: #ffffff;
            --text: #1f2a37;
            --muted: #6b7280;
            --border: #d2d8e0;
            --primary: #012062;
            --primary-hover: #012034;
            --danger: #cc3232;
        }

        * {
            box-sizing: border-box;
        }

        html,
        body {
            height: 100%;
            margin: 0;
            font-family: "Khmer OS Siemreap", sans-serif;
            color: var(--text);
        }

        [ng-cloak] {
            display: none !important;
        }

        p[ng-bind]:empty {
            display: none;
        }

        .login-page {
            background: var(--bg);
            min-height: 100vh;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px 16px;
        }

        .container {
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
        }

        .py-5 {
            padding-top: 3rem;
            padding-bottom: 3rem;
        }

        .row {
            display: flex;
            flex-wrap: wrap;
            margin-left: -12px;
            margin-right: -12px;
        }

        .justify-content-center {
            justify-content: center;
        }

        .col-12,
        .col-md-6,
        .col-lg-5 {
            width: 100%;
            padding-left: 12px;
            padding-right: 12px;
        }

        @media (min-width: 768px) {
            .col-md-6 {
                width: 50%;
            }
        }

        @media (min-width: 992px) {
            .col-lg-5 {
                width: 41.6667%;
            }
        }

        .card {
            background: var(--card-bg);
            border: 1px solid #e5e7eb;
            border-radius: 5px;
        }

        .shadow-lg {
            box-shadow: 0 10px 25px rgba(2, 24, 78, 0.15);
        }

        .login-card,
        .login-card .form-control,
        .login-card .btn {
            border-radius: 4px;
        }

        .login-card {
            overflow: hidden;
        }

        .header-bg {
            margin-top: 14px;
            background: url("./images/usea.png") no-repeat center center;
            background-size: contain;
            height: 170px;
        }

        .login-body {
            padding: 30px;
        }

        .mb-3 {
            margin-bottom: 1rem;
        }

        .mb-2 {
            margin-bottom: 0.5rem;
        }

        .form-label {
            display: inline-block;
            margin-bottom: 0.5rem;
            font-size: 1.05rem;
        }

        .form-control {
            width: 100%;
            font-family: "Khmer OS Siemreap", sans-serif;
            border: 1px solid var(--border);
            background: #fff;
            color: var(--text);
            font-size: 1rem;
            line-height: 1.4;
            padding: 10px 12px;
            transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .form-control:focus {
            outline: none;
            border-color: #496aa8;
            box-shadow: 0 0 0 3px rgba(1, 32, 98, 0.12);
        }

        .input-icon {
            position: relative;
        }

        .input-icon .form-control {
            padding-right: 44px;
        }

        .input-icon-btn {
            position: absolute;
            top: 50%;
            right: 12px;
            transform: translateY(-50%);
            background: transparent;
            border: none;
            color: #687386;
            padding: 0;
            line-height: 1;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }

        .input-icon-btn svg {
            width: 18px;
            height: 18px;
        }

        .input-icon-btn:focus {
            outline: none;
        }

        .btn {
            display: inline-block;
            font-family: inherit;
            font-size: 1rem;
            padding: 10px 16px;
            border: 1px solid transparent;
            cursor: pointer;
            text-align: center;
        }

        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .btn-primary-login {
            font-family: inherit;
            background-color: var(--primary);
            color: #fff;
        }

        .btn-primary-login:hover {
            background-color: var(--primary-hover);
            color: #fff;
        }

        .w-100 {
            width: 100%;
        }

        .btn-lg {
            font-size: 1.1rem;
            padding: 11px 16px;
        }

        .invalid-feedback {
            color: var(--danger);
            font-size: 0.9rem;
            margin-top: 0.25rem;
        }

        .d-block {
            display: block;
        }

        .text-center {
            text-align: center;
        }

        .text-sm {
            font-size: 0.9rem;
        }

        .text-muted {
            color: var(--muted);
        }
    </style>
</head>
<body>
    <div class="login-page" ng-controller="LoginCtrl as vm">
        <div class="container py-5">
            <div class="row justify-content-center">
                <div class="col-12 col-md-6 col-lg-5">
                    <div class="card shadow-lg login-card">
                        <div class="header-bg"></div>
                        <div class="login-body">
                            <form name="loginForm" ng-submit="vm.signIn(loginForm)" novalidate>
                                <div class="mb-3">
                                    <label class="form-label">ឈ្មោះអ្នកប្រើ</label>
                                    <div class="input-icon">
                                        <input type="text" id="login-name" class="form-control"
                                            name="username" autocomplete="username" required ng-model="vm.username">
                                        <span class="input-icon-btn" aria-hidden="true">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <circle cx="12" cy="8" r="4"></circle>
                                                <path d="M4 20c1.8-3.2 5-5 8-5s6.2 1.8 8 5"></path>
                                            </svg>
                                        </span>
                                    </div>
                                    <div class="invalid-feedback d-block" ng-show="loginForm.username.$touched && loginForm.username.$invalid">
                                        សូមបញ្ចូលឈ្មោះ
                                    </div>
                                </div>

                                <div class="mb-3">
                                    <label class="form-label">លេខសម្ងាត់</label>
                                    <div class="input-icon">
                                        <input id="login-password" class="form-control"
                                            ng-attr-type="{{ vm.showPassword ? 'text' : 'password' }}"
                                            name="password" autocomplete="current-password" required ng-model="vm.password" ng-minlength="6">
                                        <button type="button" class="input-icon-btn"
                                            ng-attr-aria-label="{{ vm.showPassword ? 'Hide password' : 'Show password' }}"
                                            ng-click="vm.togglePassword()">
                                            <svg ng-if="!vm.showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <rect x="5" y="10" width="14" height="10" rx="2"></rect>
                                                <path d="M8 10V7a4 4 0 0 1 8 0v3"></path>
                                            </svg>
                                            <svg ng-if="vm.showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <rect x="5" y="10" width="14" height="10" rx="2"></rect>
                                                <path d="M8 10V7a4 4 0 0 1 6.5-3.1"></path>
                                                <path d="M3 3l18 18"></path>
                                            </svg>
                                        </button>
                                    </div>
                                    <div class="invalid-feedback d-block" ng-show="loginForm.password.$touched && loginForm.password.$invalid">
                                        សូមបញ្ចូលលេខសម្ងាត់
                                    </div>
                                </div>

                                <button type="submit" class="btn btn-primary-login w-100 btn-lg mb-2"
                                    ng-disabled="loginForm.$invalid || vm.isSubmitting">
                                    បញ្ជូល
                                </button>

                                <p class="text-center text-sm text-muted mb-0" ng-bind="vm.message" ng-cloak></p>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

   <script>
(function () {
    if (!window.angular) return;

    angular.module("loginApp", [])
        .controller("LoginCtrl", ["$http", "$timeout", "$window", function ($http, $timeout, $window) {
            var LOGIN_API = "http://127.0.0.1:8000/api/login";

            var vm = this;
            vm.username = "";
            vm.password = "";
            vm.showPassword = false;
            vm.isSubmitting = false;
            vm.message = "";

            vm.togglePassword = function () {
                vm.showPassword = !vm.showPassword;
            };

            vm.signIn = function (form) {
                if (!form || form.$invalid) return;

                vm.isSubmitting = true;
                vm.message = "កំពុងចូលប្រព័ន្ធ...";

                $http({
                    method: "POST",
                    url: LOGIN_API,
                    data: {
                        username: String(vm.username || "").trim(),
                        password: String(vm.password || "")
                    },
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json"
                    }
                })
                .then(function (response) {
                    var data = response.data || {};

                    if (!data.token) {
                        vm.message = "ចូលប្រព័ន្ធបរាជ័យ";
                        return;
                    }

                    $window.localStorage.setItem("auth_token", data.token);
                    $window.localStorage.setItem("token_type", data.token_type || "Bearer");
                    if (data.user) {
                        $window.localStorage.setItem("auth_user", JSON.stringify(data.user));
                    }
                    $window.localStorage.setItem("show_dashboard_welcome", "1");

                    vm.message = "ចូលប្រព័ន្ធជោគជ័យ";
                    $timeout(function () {
                        $window.location.href = "page.php#/dashboard";
                    }, 400);
                })
                .catch(function (error) {
                    if (error.status === 401) {
                        vm.message = "ឈ្មោះអ្នកប្រើ ឬ លេខសម្ងាត់មិនត្រឹមត្រូវ";
                    } else if (error.status === 422) {
                        vm.message = "សូមបញ្ចូលឈ្មោះ និង លេខសម្ងាត់";
                    } else {
                        vm.message = "មិនអាចភ្ជាប់ទៅ API បាន";
                    }
                })
                .finally(function () {
                    vm.isSubmitting = false;
                });
            };
        }]);
})();
</script>

</body>
</html>
