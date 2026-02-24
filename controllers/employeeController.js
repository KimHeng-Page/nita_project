app.controller("EmployeeController", function($scope, $location, $filter, $window, $timeout, EmployeeService){

    $scope.employees = [];
    $scope.newEmployee = createEmptyEmployee();
    $scope.currentPage = 1;
    $scope.pageSize = 8;
    $scope.filteredEmployees = [];
    $scope.showCreateModal = false;
    $scope.showDetailModal = false;
    $scope.selectedEmployee = null;
    $scope.isEditMode = false;
    $scope.editEmployeeId = null;
    $scope.createError = "";

    function renderLucideIcons(){
        $timeout(function(){
            if ($window.lucide && typeof $window.lucide.createIcons === "function") {
                $window.lucide.createIcons();
            }
        }, 0);
    }

    function createEmptyEmployee(){
        return {
            fullname: "",
            age: "",
            address: "",
            birth: "",
            email: "",
            imageFile: null,
            department: "",
            description: "",
            position: ""
        };
    }

    $scope.openCreateModal = function(){
        $scope.newEmployee = createEmptyEmployee();
        $scope.isEditMode = false;
        $scope.editEmployeeId = null;
        $scope.createError = "";
        $scope.showCreateModal = true;
    };

    $scope.openEditModal = function(emp){
        if (!emp) {
            return;
        }
        $scope.showDetailModal = false;
        $scope.selectedEmployee = null;
        $scope.newEmployee = angular.copy(emp);
        $scope.newEmployee.imageFile = null;
        $scope.isEditMode = true;
        $scope.editEmployeeId = emp.id;
        $scope.createError = "";
        $scope.showCreateModal = true;
    };

    $scope.closeCreateModal = function(){
        $scope.showCreateModal = false;
        $scope.newEmployee = createEmptyEmployee();
        $scope.isEditMode = false;
        $scope.editEmployeeId = null;
        $scope.createError = "";
    };

    $scope.openDetailModal = function(emp){
        if (!emp) {
            return;
        }
        $scope.selectedEmployee = angular.copy(emp);
        $scope.showDetailModal = true;
    };

    $scope.closeDetailModal = function(){
        $scope.showDetailModal = false;
        $scope.selectedEmployee = null;
    };

    function refreshFilteredEmployees(){
        var filtered = $filter("filter")($scope.employees, $scope.searchText);
        $scope.filteredEmployees = $filter("orderBy")(filtered, "-id");
        var totalPages = $scope.getTotalPages();
        if ($scope.currentPage > totalPages) {
            $scope.currentPage = totalPages;
        }
        if ($scope.currentPage < 1) {
            $scope.currentPage = 1;
        }
    }

    $scope.getTotalPages = function(){
        var pages = Math.ceil($scope.filteredEmployees.length / $scope.pageSize);
        return pages > 0 ? pages : 1;
    };

    $scope.getPageNumbers = function(){
        var pages = [];
        var total = $scope.getTotalPages();
        for (var i = 1; i <= total; i++) {
            pages.push(i);
        }
        return pages;
    };

    $scope.getPaginatedEmployees = function(){
        var start = ($scope.currentPage - 1) * $scope.pageSize;
        return $scope.filteredEmployees.slice(start, start + $scope.pageSize);
    };

    $scope.getImageUrl = function(image){
        var baseUrl = "http://127.0.0.1:8000";

        if (!image) {
            return "";
        }

        if (typeof image === "object" && image.url) {
            image = image.url;
        }
        image = String(image).replace(/\\/g, "/");

        if (/^(https?:)?\/\//.test(image) || image.indexOf("data:") === 0 || image.indexOf("blob:") === 0) {
            return image;
        }

        if (image.indexOf("/storage/") === 0 || image.indexOf("/uploads/") === 0) {
            return baseUrl + image;
        }

        if (image.indexOf("storage/") === 0 || image.indexOf("uploads/") === 0) {
            return baseUrl + "/" + image;
        }

        if (image.indexOf("/") === 0) {
            return baseUrl + image;
        }

        return baseUrl + "/storage/" + image;
    };

    $scope.goToPage = function(page){
        if (page < 1 || page > $scope.getTotalPages()) {
            return;
        }
        $scope.currentPage = page;
    };

    function loadEmployees(){
        return EmployeeService.getAll().then(function(response){
            $scope.employees = response.data;
            refreshFilteredEmployees();
        });
    }

    loadEmployees();
    renderLucideIcons();

    $scope.$watch("searchText", function(){
        $scope.currentPage = 1;
        refreshFilteredEmployees();
    });

    $scope.$watchCollection("employees", function(){
        refreshFilteredEmployees();
    });

    $scope.addEmployee = function(){
        $scope.createError = "";
        EmployeeService.create($scope.newEmployee)
        .then(function(){
            $scope.newEmployee = createEmptyEmployee();
            if ($scope.showCreateModal) {
                $scope.showCreateModal = false;
                $scope.isEditMode = false;
                $scope.editEmployeeId = null;
                $scope.searchText = "";
                return loadEmployees().then(function(){
                    $scope.currentPage = 1;
                    refreshFilteredEmployees();
                });
            }
            $location.path("/employees");
        })
        .catch(function(error){
            $scope.createError = (error && error.data && error.data.message) ? error.data.message : "Create employee failed.";
        });
    };

    $scope.updateEmployee = function(){
        $scope.createError = "";
        if (!$scope.editEmployeeId) {
            return;
        }
        EmployeeService.update($scope.editEmployeeId, $scope.newEmployee)
        .then(function(){
            $scope.showCreateModal = false;
            $scope.newEmployee = createEmptyEmployee();
            $scope.isEditMode = false;
            $scope.editEmployeeId = null;
            return loadEmployees();
        })
        .catch(function(error){
            $scope.createError = (error && error.data && error.data.message) ? error.data.message : "Update employee failed.";
        });
    };

    $scope.submitEmployee = function(){
        if ($scope.isEditMode) {
            $scope.updateEmployee();
            return;
        }
        $scope.addEmployee();
    };

    $scope.deleteEmployee = function(id){
        var confirmed = $window.confirm("តើអ្នកប្រាកដថាចង់លុបទិន្នន័យនេះមែនទេ?");
        if (!confirmed) {
            return;
        }

        EmployeeService.delete(id)
        .then(function(){
            return loadEmployees();
        })
        .then(function(){
            $window.alert("លុបទិន្នន័យបានជោគជ័យ");
        })
        .catch(function(error){
            var message = (error && error.data && error.data.message) ? error.data.message : "លុបទិន្នន័យមិនបានជោគជ័យ";
            $window.alert(message);
        });
    };

});
