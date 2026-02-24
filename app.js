var app = angular.module("hrApp", ["ngRoute"]);

app.config(function($routeProvider, $locationProvider){
    
    if ($locationProvider && typeof $locationProvider.hashPrefix === "function") {
        $locationProvider.hashPrefix("");
    }

    $routeProvider
    .when("/", {
        redirectTo: "/dashboard"
    })
    .when("/dashboard", {
        templateUrl: "views/dashboard.html?v=20260224-5",
        controller: "DashboardController",
        title: "Dashboard"
    })
    .when("/employees", {
        templateUrl: "views/list.html?v=20260224-5",
        controller: "EmployeeController",
        title: "Employees"
    })
    .when("/department", {
        templateUrl: "views/department.html?v=20260224-9",
        controller: "DepartmentController",
        title: "Department"
    })
    .when("/attendances", {
        templateUrl: "views/attendance.html?v=20260224-6",
        controller: "AttendanceController",
        title: "Attendances"
    })
    .when("/attendance", {
        redirectTo: "/attendances"
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
        title: "Add Employee"
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
