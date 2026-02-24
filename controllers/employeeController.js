app.controller("EmployeeController", function($scope, $location, $filter, $window, $timeout, $http, EmployeeService){

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
    $scope.departmentOptions = [];
    $scope.departmentNameOptions = [];
    $scope.activeDepartmentNameOptions = [];
    $scope.activeDepartmentDescriptionOptions = [];

    function normalizeDepartmentStatus(status){
        if (status === true || status === 1 || status === "1") {
            return "active";
        }
        if (status === false || status === 0 || status === "0") {
            return "inactive";
        }

        var text = String(status || "").trim().toLowerCase();
        if (text === "active" || text === "on" || text === "enabled" || text === "true") {
            return "active";
        }
        return "inactive";
    }

    function extractDepartmentOptions(payload){
        if (angular.isArray(payload)) {
            return payload;
        }

        if (payload && angular.isArray(payload.data)) {
            return payload.data;
        }

        if (payload && payload.data && angular.isArray(payload.data.data)) {
            return payload.data.data;
        }

        return [];
    }

    function buildDepartmentNameOptions(options){
        var map = {};

        (options || []).forEach(function(dept){
            var rawName = (dept && dept.name !== undefined && dept.name !== null) ? String(dept.name).trim() : "";
            if (!rawName) {
                return;
            }

            var key = rawName.toLowerCase();
            var currentStatus = normalizeDepartmentStatus(dept.status);

            if (!map[key]) {
                map[key] = {
                    id: dept.id || key,
                    name: rawName,
                    status: currentStatus
                };
                return;
            }

            // If any duplicate name is active, keep the merged option active.
            if (currentStatus === "active") {
                map[key].status = "active";
            }
        });

        return Object.keys(map).map(function(key){
            return map[key];
        }).sort(function(a, b){
            return a.name.localeCompare(b.name);
        });
    }

    function buildActiveDepartmentNameOptions(options){
        var map = {};

        (options || []).forEach(function(dept){
            if (normalizeDepartmentStatus(dept && dept.status) !== "active") {
                return;
            }

            var rawName = (dept && dept.name !== undefined && dept.name !== null) ? String(dept.name).trim() : "";
            if (!rawName) {
                return;
            }

            var key = rawName.toLowerCase();
            if (!map[key]) {
                map[key] = {
                    id: dept.id || key,
                    name: rawName
                };
            }
        });

        return Object.keys(map).map(function(key){
            return map[key];
        }).sort(function(a, b){
            return a.name.localeCompare(b.name);
        });
    }

    function buildActiveDepartmentDescriptionOptions(options){
        var map = {};

        (options || []).forEach(function(dept){
            if (normalizeDepartmentStatus(dept && dept.status) !== "active") {
                return;
            }

            var rawDescription = (dept && dept.description !== undefined && dept.description !== null)
                ? String(dept.description).trim()
                : "";

            if (!rawDescription) {
                return;
            }

            var key = rawDescription.toLowerCase();
            if (!map[key]) {
                map[key] = {
                    id: dept.id || key,
                    description: rawDescription
                };
            }
        });

        return Object.keys(map).map(function(key){
            return map[key];
        }).sort(function(a, b){
            return a.description.localeCompare(b.description);
        });
    }

    function loadDepartmentOptions(){
        return $http.get("http://127.0.0.1:8000/api/departments")
            .then(function(response){
                $scope.departmentOptions = extractDepartmentOptions(response.data);
                $scope.departmentNameOptions = buildDepartmentNameOptions($scope.departmentOptions);
                $scope.activeDepartmentNameOptions = buildActiveDepartmentNameOptions($scope.departmentOptions);
                $scope.activeDepartmentDescriptionOptions = buildActiveDepartmentDescriptionOptions($scope.departmentOptions);
            })
            .catch(function(){
                $scope.departmentOptions = [];
                $scope.departmentNameOptions = [];
                $scope.activeDepartmentNameOptions = [];
                $scope.activeDepartmentDescriptionOptions = [];
            });
    }

    $scope.isDepartmentSelectable = function(dept){
        return normalizeDepartmentStatus(dept && dept.status) === "active";
    };

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
    loadDepartmentOptions();
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
