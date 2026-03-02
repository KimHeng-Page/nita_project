var app = angular.module("hrApp", ["ngRoute"]);

var TEMPLATE_VERSION = (typeof window !== "undefined" && window.__TEMPLATE_VERSION__)
    ? String(window.__TEMPLATE_VERSION__)
    : String(Date.now());

function withTemplateVersion(path) {
    return path + "?v=" + encodeURIComponent(TEMPLATE_VERSION);
}

app.config(function($routeProvider, $locationProvider, $httpProvider){
    if ($locationProvider && typeof $locationProvider.hashPrefix === "function") {
        $locationProvider.hashPrefix("");
    }

    $httpProvider.defaults.headers.common.Accept = "application/json";
    $httpProvider.defaults.withCredentials = false;
    $httpProvider.interceptors.push(function() {
        var rawApiBase = (typeof window !== "undefined" && window.__API_BASE__)
            ? String(window.__API_BASE__)
            : "/api";
        var apiBase = rawApiBase.replace(/\/+$/, "");

        return {
            request: function(config) {
                if (!config || !config.url || typeof config.url !== "string") {
                    return config;
                }

                if (config.url.indexOf("/api/") === 0) {
                    config.url = apiBase + config.url.substring(4);
                } else if (config.url.indexOf("api/") === 0) {
                    config.url = apiBase + "/" + config.url.substring(4);
                } else if (config.url === "/api") {
                    config.url = apiBase;
                } else if (config.url === "api") {
                    config.url = apiBase;
                }

                try {
                    var token = window.sessionStorage.getItem("auth_token");
                    if (token && !config.headers.Authorization) {
                        config.headers.Authorization = "Bearer " + token;
                    }
                } catch (e) {
                    // ignore storage access errors
                }

                return config;
            }
        };
    });

    $routeProvider
    .when("/", {
        redirectTo: "/dashboard"
    })
    .when("/dashboard", {
        templateUrl: withTemplateVersion("views/dashboard.html"),
        controller: "DashboardController",
        title: "ផ្ទាំងគ្រប់គ្រង"
    })
    .when("/employees", {
        templateUrl: withTemplateVersion("views/list.html"),
        controller: "EmployeeController",
        title: "គ្រប់គ្រងបុគ្គលិក"
    })
    .when("/department", {
        templateUrl: withTemplateVersion("views/department.html"),
        controller: "DepartmentController",
        title: "គ្រប់គ្រងផ្នែក"
    })
    .when("/attendances", {
        templateUrl: withTemplateVersion("views/attendance.html"),
        controller: "AttendanceController",
        title: "គ្រប់គ្រងវត្តមាន"
    })
    .when("/attendance", {
        redirectTo: "/attendances"
    })
    .when("/leaves", {
        templateUrl: withTemplateVersion("views/leaves.html"),
        controller: "LeaveController",
        title: "គ្រប់គ្រងច្បាប់ឈប់សម្រាក"
    })
    .when("/payroll", {
        templateUrl: withTemplateVersion("views/paryrolle.html"),
        controller: "PayrollController",
        title: "បញ្ជីប្រាក់បៀវត្ស"
    })
    .when("/paryrolle", {
        redirectTo: "/payroll"
    })
    .when("/leave", {
        redirectTo: "/leaves"
    })
    .when("/department.html", {
        redirectTo: "/department"
    })
    .when("/departments", {
        redirectTo: "/department"
    })
    .when("/add", {
        templateUrl: withTemplateVersion("views/add.html"),
        controller: "EmployeeController",
        title: "បន្ថែមបុគ្គលិក"
    })
    .otherwise({
        redirectTo: "/dashboard"
    });
});

app.run(function($rootScope, $templateCache){
    $rootScope.$on("$routeChangeStart", function(){
        $templateCache.removeAll();
    });

    $rootScope.$on("$routeChangeSuccess", function(event, current){
        var routeTitle = current && current.$$route ? current.$$route.title : "";
        document.title = routeTitle ? (routeTitle + " | USEA") : "USEA";
    });
});

app.directive("fileModel", ["$parse", function($parse){
    return {
        restrict: "A",
        link: function(scope, element, attrs){
            var model = $parse(attrs.fileModel);
            var modelSetter = model.assign;

            element.bind("change", function(){
                scope.$apply(function(){
                    modelSetter(scope, element[0].files[0] || null);
                });
            });
        }
    };
}]);

