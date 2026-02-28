app.controller('DepartmentController', function($scope, $http, $filter) {

    $scope.departments = [];
    $scope.filteredDepartments = [];
    $scope.department = {};
    $scope.editMode = false;
    $scope.showEditModal = false;
    $scope.showCreateModal = false;
    $scope.currentPage = 1;
    $scope.pageSize = 8;
    $scope.pagination = {
        currentPage: 1,
        pageSize: 10,
        pageSizeOptions: [5, 10, 20, 50],
        totalItems: 0,
        totalPages: 1
    };
    $scope.visiblePages = [];

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
        refreshPagination();
    }

    function buildVisiblePages(currentPage, totalPages) {
        var pages = [];
        var start = Math.max(1, currentPage - 2);
        var end = Math.min(totalPages, start + 4);
        start = Math.max(1, end - 4);
        for (var i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    }

    function refreshPagination() {
        var totalItems = ($scope.filteredDepartments && $scope.filteredDepartments.length) ? $scope.filteredDepartments.length : 0;
        var pageSize = Number($scope.pagination.pageSize) || 10;
        var totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

        if ($scope.pagination.currentPage > totalPages) {
            $scope.pagination.currentPage = totalPages;
        }
        if ($scope.pagination.currentPage < 1) {
            $scope.pagination.currentPage = 1;
        }

        $scope.pagination.totalItems = totalItems;
        $scope.pagination.totalPages = totalPages;
        $scope.currentPage = $scope.pagination.currentPage;
        $scope.pageSize = pageSize;
        $scope.visiblePages = buildVisiblePages($scope.pagination.currentPage, totalPages);
    }

    $scope.getTotalPages = function() {
        var pages = Math.ceil($scope.filteredDepartments.length / $scope.pageSize);
        return pages > 0 ? pages : 1;
    };

    $scope.getPageNumbers = function() {
        return $scope.visiblePages;
    };

    $scope.getPaginatedDepartments = function() {
        var start = ($scope.pagination.currentPage - 1) * $scope.pagination.pageSize;
        return $scope.filteredDepartments.slice(start, start + $scope.pageSize);
    };

    $scope.goToPage = function(page) {
        if (page < 1 || page > $scope.pagination.totalPages) {
            return;
        }
        $scope.pagination.currentPage = page;
        $scope.currentPage = page;
        refreshPagination();
    };

    $scope.setPage = function(page) {
        $scope.goToPage(page);
    };

    $scope.prevPage = function() {
        $scope.goToPage($scope.pagination.currentPage - 1);
    };

    $scope.nextPage = function() {
        $scope.goToPage($scope.pagination.currentPage + 1);
    };

    $scope.changePageSize = function() {
        $scope.pagination.currentPage = 1;
        $scope.currentPage = 1;
        refreshPagination();
    };

    $scope.loadDepartments = function() {
        $http.get('/api/departments')
            .then(function(response) {
                $scope.departments = response.data;
                refreshFilteredDepartments();
            });
    };

    $scope.saveDepartment = function() {
        var payload = buildDepartmentPayload($scope.department);

        if ($scope.editMode) {
            $http.put('/api/departments/' + $scope.department.id, payload)
                .then(function() {
                    $scope.loadDepartments();
                    $scope.department = {};
                    $scope.editMode = false;
                    $scope.showEditModal = false;
                });
        } else {
            $http.post('/api/departments', payload)
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
        if (confirm("តើអ្នកប្រាកដថាចង់លុបទិន្នន័យផ្នែកការងារនេះមែនទេ?")) {
            $http.delete('/api/departments/' + id)
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

        $http.put('/api/departments/' + dept.id, payload)
            .then(function() {
                dept.status = payload.status;
            })
            .finally(function() {
                dept._statusUpdating = false;
            });
    };

    $scope.$watch("searchText", function() {
        $scope.currentPage = 1;
        $scope.pagination.currentPage = 1;
        refreshFilteredDepartments();
    });

    $scope.$watchCollection("departments", function() {
        refreshFilteredDepartments();
    });

    $scope.loadDepartments();

});
