app.controller('DepartmentController', function($scope, $http, $filter) {

    $scope.departments = [];
    $scope.filteredDepartments = [];
    $scope.department = {};
    $scope.editMode = false;
    $scope.showEditModal = false;
    $scope.showCreateModal = false;
    $scope.currentPage = 1;
    $scope.pageSize = 8;

    function buildDepartmentPayload(source) {
        var payload = angular.copy(source || {});
        delete payload._statusUpdating;
        return payload;
    }

    function normalizeStatus(status) {
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
        if (text === "inactive" || text === "off" || text === "disabled" || text === "false") {
            return "inactive";
        }
        return "inactive";
    }

    $scope.isDepartmentActive = function(dept) {
        return normalizeStatus(dept && dept.status) === "active";
    };

    function refreshFilteredDepartments() {
        var filtered = $filter("filter")($scope.departments, $scope.searchText);
        $scope.filteredDepartments = $filter("orderBy")(filtered, "-id");

        var totalPages = $scope.getTotalPages();
        if ($scope.currentPage > totalPages) {
            $scope.currentPage = totalPages;
        }
        if ($scope.currentPage < 1) {
            $scope.currentPage = 1;
        }
    }

    $scope.getTotalPages = function() {
        var pages = Math.ceil($scope.filteredDepartments.length / $scope.pageSize);
        return pages > 0 ? pages : 1;
    };

    $scope.getPageNumbers = function() {
        var pages = [];
        var total = $scope.getTotalPages();
        for (var i = 1; i <= total; i++) {
            pages.push(i);
        }
        return pages;
    };

    $scope.getPaginatedDepartments = function() {
        var start = ($scope.currentPage - 1) * $scope.pageSize;
        return $scope.filteredDepartments.slice(start, start + $scope.pageSize);
    };

    $scope.goToPage = function(page) {
        if (page < 1 || page > $scope.getTotalPages()) {
            return;
        }
        $scope.currentPage = page;
    };

    $scope.loadDepartments = function() {
        $http.get('http://localhost:8000/api/departments')
            .then(function(response) {
                $scope.departments = response.data;
                refreshFilteredDepartments();
            });
    };

    $scope.saveDepartment = function() {
        var payload = buildDepartmentPayload($scope.department);

        if ($scope.editMode) {
            $http.put('http://localhost:8000/api/departments/' + $scope.department.id, payload)
                .then(function() {
                    $scope.loadDepartments();
                    $scope.department = {};
                    $scope.editMode = false;
                    $scope.showEditModal = false;
                });
        } else {
            $http.post('http://localhost:8000/api/departments', payload)
                .then(function() {
                    $scope.loadDepartments();
                    $scope.department = {};
                    $scope.showCreateModal = false;
                });
        }
    };

    $scope.openCreateModal = function() {
        $scope.department = { status: "active" };
        $scope.editMode = false;
        $scope.showEditModal = false;
        $scope.showCreateModal = true;
    };

    $scope.closeCreateModal = function() {
        $scope.showCreateModal = false;
        $scope.editMode = false;
        $scope.department = {};
    };

    $scope.editDepartment = function(dept) {
        $scope.department = angular.copy(dept);
        $scope.editMode = true;
        $scope.showEditModal = true;
    };

    $scope.closeEditModal = function() {
        $scope.showEditModal = false;
        $scope.showCreateModal = false;
        $scope.editMode = false;
        $scope.department = {};
    };

    $scope.deleteDepartment = function(id) {
        if (confirm("Are you sure?")) {
            $http.delete('http://localhost:8000/api/departments/' + id)
                .then(function() {
                    $scope.loadDepartments();
                });
        }
    };

    $scope.toggleDepartmentStatus = function(dept) {
        if (!dept || !dept.id || dept._statusUpdating) {
            return;
        }

        var payload = buildDepartmentPayload(dept);
        payload.status = $scope.isDepartmentActive(dept) ? "inactive" : "active";
        dept._statusUpdating = true;

        $http.put('http://localhost:8000/api/departments/' + dept.id, payload)
            .then(function() {
                dept.status = payload.status;
            })
            .finally(function() {
                dept._statusUpdating = false;
            });
    };

    $scope.$watch("searchText", function() {
        $scope.currentPage = 1;
        refreshFilteredDepartments();
    });

    $scope.$watchCollection("departments", function() {
        refreshFilteredDepartments();
    });

    $scope.loadDepartments();

});
