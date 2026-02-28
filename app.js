var app = angular.module("hrApp", ["ngRoute"]);

app.config(function($routeProvider, $locationProvider, $httpProvider){
    if ($locationProvider && typeof $locationProvider.hashPrefix === "function") {
        $locationProvider.hashPrefix("");
    }

    $httpProvider.defaults.headers.common.Accept = "application/json";
    $httpProvider.interceptors.push(function() {
        return {
            request: function(config) {
                config.headers = config.headers || {};
                try {
                    var token = localStorage.getItem("auth_token");
                    if (token && !config.headers.Authorization) {
                        config.headers.Authorization = "Bearer " + token;
                    }
                } catch (e) {
                    
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
        templateUrl: "views/dashboard.html?v=20260225-19",
        controller: "DashboardController",
        title: "ផ្ទាំងគ្រប់គ្រង"
    })
    .when("/employees", {
        templateUrl: "views/list.html?v=20260225-16",
        controller: "EmployeeController",
        title: "គ្រប់គ្រងបុគ្គលិក"
    })
    .when("/department", {
        templateUrl: "views/department.html?v=20260225-16",
        controller: "DepartmentController",
        title: "គ្រប់គ្រងផ្នែក"
    })
    .when("/attendances", {
        templateUrl: "views/attendance.html?v=20260225-17",
        controller: "AttendanceController",
        title: "គ្រប់គ្រងវត្តមាន"
    })
    .when("/attendance", {
        redirectTo: "/attendances"
    })
    .when("/leaves", {
        templateUrl: "views/leaves.html?v=20260228-1",
        controller: "LeaveController",
        title: "គ្រប់គ្រងច្បាប់ឈប់សម្រាក"
    })
    .when("/payroll", {
        templateUrl: "views/paryrolle.html?v=20260226-1",
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
        templateUrl: "views/add.html?v=20260221",
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

