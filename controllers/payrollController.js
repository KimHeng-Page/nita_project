app.controller("PayrollController", function($scope, $filter, $window, EmployeeService, PayrollService){

    $scope.employees = [];
    $scope.payrolls = [];
    $scope.filteredPayrolls = [];
    $scope.searchText = "";
    $scope.filters = {
        month: "",
        year: ""
    };
    $scope.form = createEmptyPayrollForm();
    $scope.pagination = {
        currentPage: 1,
        pageSize: 10,
        pageSizeOptions: [5, 10, 20, 50],
        totalItems: 0,
        totalPages: 1
    };
    $scope.visiblePages = [];
    $scope.showCreateModal = false;
    $scope.showDetailModal = false;
    $scope.selectedPayroll = null;
    $scope.isEditMode = false;
    $scope.editPayrollId = null;
    $scope.saveError = "";

    function createEmptyPayrollForm(){
        return {
            employee_id: "",
            month: "",
            year: (new Date()).getFullYear(),
            base_salary: "",
            ot_day: "",
            absent_days: "",
            tax: ""
        };
    }

    function normalizePayrolls(payload){
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

    function buildVisiblePages(currentPage, totalPages){
        var pages = [];
        var start = Math.max(1, currentPage - 2);
        var end = Math.min(totalPages, start + 4);
        start = Math.max(1, end - 4);

        for (var i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    }

    function refreshPagination(){
        var totalItems = ($scope.filteredPayrolls && $scope.filteredPayrolls.length) ? $scope.filteredPayrolls.length : 0;
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
        $scope.visiblePages = buildVisiblePages($scope.pagination.currentPage, totalPages);
    }

    function matchesAdvancedFilters(item){
        var monthFilter = String($scope.filters.month || "").trim();
        var yearFilter = String($scope.filters.year || "").trim();

        if (monthFilter && String(item.month || "") !== monthFilter) {
            return false;
        }
        if (yearFilter && String(item.year || "") !== yearFilter) {
            return false;
        }
        return true;
    }

    function refreshFilteredPayrolls(){
        var searched = $filter("filter")($scope.payrolls, $scope.searchText);
        $scope.filteredPayrolls = $filter("orderBy")(searched.filter(matchesAdvancedFilters), ["-year", "-month", "-id"]);
        refreshPagination();
    }

    function loadEmployees(){
        return EmployeeService.getAll().then(function(res){
            $scope.employees = res.data || [];
        });
    }

    function loadPayrolls(){
        return PayrollService.getAll().then(function(res){
            $scope.payrolls = normalizePayrolls(res.data);
            refreshFilteredPayrolls();
        });
    }

    function normalizePayloadFromForm(){
        return {
            employee_id: $scope.form.employee_id,
            month: $scope.form.month,
            year: $scope.form.year,
            base_salary: $scope.form.base_salary,
            ot_day: $scope.form.ot_day || 0,
            absent_days: $scope.form.absent_days || 0,
            tax: $scope.form.tax || 0
        };
    }

    $scope.getEmployeeName = function(payroll){
        if (!payroll) {
            return "-";
        }
        if (payroll.employee_name) {
            return payroll.employee_name;
        }
        if (payroll.employee_fullname) {
            return payroll.employee_fullname;
        }
        if (payroll.employee && payroll.employee.name) {
            return payroll.employee.name;
        }
        if (payroll.employee && payroll.employee.fullname) {
            return payroll.employee.fullname;
        }
        var employeeId = payroll.employee_id || (payroll.employee && payroll.employee.id);
        var matched = ($scope.employees || []).filter(function(emp){
            return String(emp.id) === String(employeeId);
        })[0];
        return matched ? (matched.fullname || matched.name || "-") : "-";
    };

    $scope.openCreateModal = function(){
        $scope.form = createEmptyPayrollForm();
        $scope.isEditMode = false;
        $scope.editPayrollId = null;
        $scope.saveError = "";
        $scope.showCreateModal = true;
    };

    $scope.openEditModal = function(payroll){
        if (!payroll) {
            return;
        }

        var employeeId = payroll.employee_id || (payroll.employee && payroll.employee.id) || "";
        $scope.form = {
            employee_id: employeeId,
            month: payroll.month || "",
            year: payroll.year || (new Date()).getFullYear(),
            base_salary: payroll.base_salary || "",
            ot_day: payroll.ot_day || 0,
            absent_days: payroll.absent_days || 0,
            tax: payroll.tax || 0
        };
        $scope.isEditMode = true;
        $scope.editPayrollId = payroll.id || null;
        $scope.saveError = "";
        $scope.showDetailModal = false;
        $scope.showCreateModal = true;
    };

    $scope.closeCreateModal = function(){
        $scope.showCreateModal = false;
        $scope.form = createEmptyPayrollForm();
        $scope.isEditMode = false;
        $scope.editPayrollId = null;
        $scope.saveError = "";
    };

    $scope.openDetailModal = function(payroll){
        if (!payroll) {
            return;
        }
        $scope.selectedPayroll = angular.copy(payroll);
        $scope.showDetailModal = true;
    };

    $scope.closeDetailModal = function(){
        $scope.showDetailModal = false;
        $scope.selectedPayroll = null;
    };

    $scope.generatePayroll = function(){
        $scope.saveError = "";
        PayrollService.generate(normalizePayloadFromForm())
        .then(function(){
            $scope.closeCreateModal();
            return loadPayrolls();
        })
        .catch(function(error){
            $scope.saveError = (error && error.data && error.data.message) ? error.data.message : "Create payroll failed.";
        });
    };

    $scope.updatePayroll = function(){
        if (!$scope.editPayrollId) {
            $scope.saveError = "This payroll record cannot be edited because id is missing.";
            return;
        }
        $scope.saveError = "";
        PayrollService.update($scope.editPayrollId, normalizePayloadFromForm())
        .then(function(){
            $scope.closeCreateModal();
            return loadPayrolls();
        })
        .catch(function(error){
            $scope.saveError = (error && error.data && error.data.message) ? error.data.message : "Update payroll failed.";
        });
    };

    $scope.submitPayroll = function(){
        if ($scope.isEditMode) {
            $scope.updatePayroll();
            return;
        }
        $scope.generatePayroll();
    };

    $scope.deletePayroll = function(payroll){
        if (!payroll || !payroll.id) {
            $window.alert("Cannot delete this record because id is missing.");
            return;
        }
        if (!$window.confirm("Are you sure you want to delete this payroll record?")) {
            return;
        }

        PayrollService.remove(payroll.id)
        .then(function(){
            if ($scope.selectedPayroll && String($scope.selectedPayroll.id) === String(payroll.id)) {
                $scope.closeDetailModal();
            }
            return loadPayrolls();
        })
        .catch(function(error){
            var message = (error && error.data && error.data.message) ? error.data.message : "Delete payroll failed.";
            $window.alert(message);
        });
    };

    $scope.getPaginatedPayrolls = function(){
        var start = ($scope.pagination.currentPage - 1) * $scope.pagination.pageSize;
        return $scope.filteredPayrolls.slice(start, start + $scope.pagination.pageSize);
    };

    $scope.goToPage = function(page){
        if (page < 1 || page > $scope.pagination.totalPages) {
            return;
        }
        $scope.pagination.currentPage = page;
        refreshPagination();
    };

    $scope.setPage = function(page){
        $scope.goToPage(page);
    };

    $scope.prevPage = function(){
        $scope.goToPage($scope.pagination.currentPage - 1);
    };

    $scope.nextPage = function(){
        $scope.goToPage($scope.pagination.currentPage + 1);
    };

    $scope.changePageSize = function(){
        $scope.pagination.currentPage = 1;
        refreshPagination();
    };

    $scope.resetFilters = function(){
        $scope.searchText = "";
        $scope.filters.month = "";
        $scope.filters.year = "";
        $scope.pagination.currentPage = 1;
        refreshFilteredPayrolls();
    };

    $scope.$watch("searchText", function(){
        $scope.pagination.currentPage = 1;
        refreshFilteredPayrolls();
    });

    $scope.$watch("filters.month", function(){
        $scope.pagination.currentPage = 1;
        refreshFilteredPayrolls();
    });

    $scope.$watch("filters.year", function(){
        $scope.pagination.currentPage = 1;
        refreshFilteredPayrolls();
    });

    $scope.$watchCollection("payrolls", function(){
        refreshFilteredPayrolls();
    });

    loadEmployees();
    loadPayrolls();
});
