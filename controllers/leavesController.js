angular.module("hrApp").controller("LeaveController", function($scope, $http, $q, $window) {
    var API_BASES = ["/api"];

    $scope.leaves = [];
    $scope.employees = [];
    $scope.leaveError = "";
    $scope.isEditMode = false;
    $scope.editingLeaveId = null;
    $scope.leave = createEmptyLeave();
    $scope.showCreateModal = false;
    $scope.showEditModal = false;
    $scope.createLeaveModel = createEmptyLeave();
    $scope.editLeaveModel = createEmptyLeave();
    $scope.paginatedLeaves = [];
    $scope.pagination = {
        currentPage: 1,
        pageSize: 10,
        pageSizeOptions: [5, 10, 20, 50],
        totalItems: 0,
        totalPages: 1
    };
    $scope.visiblePages = [];

    function createEmptyLeave() {
        return {
            employee_id: "",
            leave_type: "",
            start_date: "",
            end_date: "",
            reason: "",
            status: "Pending"
        };
    }

    function toText(value) {
        if (value === undefined || value === null) {
            return "";
        }
        return String(value).trim();
    }

    function formatYMD(dateObj) {
        if (!dateObj || isNaN(dateObj.getTime())) {
            return "";
        }
        var pad = function(n) { return String(n).padStart(2, "0"); };
        return dateObj.getFullYear() + "-" + pad(dateObj.getMonth() + 1) + "-" + pad(dateObj.getDate());
    }

    function toDateInput(value) {
        if (!value) {
            return "";
        }
        if (Object.prototype.toString.call(value) === "[object Date]") {
            return formatYMD(value);
        }

        var text = toText(value);
        if (!text) {
            return "";
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
            return text;
        }

        var parsed = new Date(text);
        if (!isNaN(parsed.getTime())) {
            return formatYMD(parsed);
        }

        if (text.length >= 10) {
            return text.substring(0, 10);
        }
        return text;
    }

    function toApiDate(value) {
        return toDateInput(value);
    }

    function extractErrorMessage(error, fallback) {
        if (error && error.data && error.data.errors) {
            var keys = Object.keys(error.data.errors);
            if (keys.length && angular.isArray(error.data.errors[keys[0]]) && error.data.errors[keys[0]].length) {
                return error.data.errors[keys[0]][0];
            }
        }
        if (error && error.data && error.data.message) {
            return error.data.message;
        }
        return fallback;
    }

    function getRequestConfig() {
        var token = "";
        try {
            token = localStorage.getItem("auth_token") || "";
        } catch (e) {
            token = "";
        }

        var headers = { Accept: "application/json" };
        if (token) {
            headers.Authorization = "Bearer " + token;
        }
        return { headers: headers };
    }

    function shouldTryFallback(error) {
        var status = error && error.status;
        return status === 0 || status === 400 || status === 404 || status === 405 || status === 422 || status === 500;
    }

    function runRequestChain(requestFactories, index, lastError) {
        if (index >= requestFactories.length) {
            return $q.reject(lastError || { message: "Request failed." });
        }

        return requestFactories[index]().catch(function(error) {
            if (!shouldTryFallback(error)) {
                return $q.reject(error);
            }
            return runRequestChain(requestFactories, index + 1, error);
        });
    }

    function buildRequestFactories(method, path, data) {
        var cfg = getRequestConfig();
        return API_BASES.map(function(base) {
            var url = base + path;
            if (method === "get") {
                return function() { return $http.get(url, cfg); };
            }
            if (method === "post") {
                return function() { return $http.post(url, data, cfg); };
            }
            if (method === "put") {
                return function() { return $http.put(url, data, cfg); };
            }
            if (method === "patch") {
                return function() {
                    return $http(angular.extend({}, cfg, {
                        method: "PATCH",
                        url: url,
                        data: data
                    }));
                };
            }
            if (method === "delete") {
                return function() { return $http.delete(url, cfg); };
            }
            return function() { return $q.reject({ message: "Unsupported request method" }); };
        });
    }

    function requestWithFallback(method, path, data) {
        return runRequestChain(buildRequestFactories(method, path, data), 0);
    }

    function extractCollection(payload) {
        if (angular.isArray(payload)) {
            return payload;
        }
        if (payload && angular.isArray(payload.data)) {
            return payload.data;
        }
        if (payload && payload.data && angular.isArray(payload.data.data)) {
            return payload.data.data;
        }
        if (payload && angular.isArray(payload.result)) {
            return payload.result;
        }
        if (payload && angular.isArray(payload.leaves)) {
            return payload.leaves;
        }
        if (payload && angular.isArray(payload.employees)) {
            return payload.employees;
        }
        return [];
    }

    function normalizeEmployee(emp) {
        var source = emp || {};
        return {
            id: source.id !== undefined && source.id !== null ? String(source.id) : "",
            fullname: source.fullname || source.full_name || source.name || "-"
        };
    }

    function normalizeLeave(item) {
        var source = item || {};
        var employee = source.employee || {};

        return {
            id: source.id || source.leave_id || source.leaveId,
            employee_id: toText(source.employee_id || source.employees_id || (employee && employee.id)),
            employee: {
                fullname: toText(employee.fullname || employee.full_name || employee.name) || "-",
                position: toText(employee.position || employee.title) || "-"
            },
            leave_type: toText(source.leave_type || source.type),
            start_date: toDateInput(source.start_date || source.startDate),
            end_date: toDateInput(source.end_date || source.endDate),
            reason: toText(source.reason || source.leave_reason || source.leaveReason || source.description || source.note || source.notes),
            status: toText(source.status || source.leave_status || "Pending")
        };
    }

    function sortLeavesByIdDesc(items) {
        var list = angular.isArray(items) ? items.slice() : [];
        list.sort(function(a, b) {
            var aId = parseInt(toText(a && a.id), 10);
            var bId = parseInt(toText(b && b.id), 10);
            var aHasNum = !isNaN(aId);
            var bHasNum = !isNaN(bId);

            if (aHasNum && bHasNum && aId !== bId) {
                return bId - aId;
            }
            if (aHasNum !== bHasNum) {
                return aHasNum ? -1 : 1;
            }
            return toText(b && b.id).localeCompare(toText(a && a.id));
        });
        return list;
    }

    function getVisiblePages(currentPage, totalPages) {
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
        var totalItems = ($scope.leaves && $scope.leaves.length) ? $scope.leaves.length : 0;
        var pageSize = Number($scope.pagination.pageSize) || 10;
        var totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

        if ($scope.pagination.currentPage > totalPages) {
            $scope.pagination.currentPage = totalPages;
        }
        if ($scope.pagination.currentPage < 1) {
            $scope.pagination.currentPage = 1;
        }

        var startIndex = ($scope.pagination.currentPage - 1) * pageSize;
        var endIndex = startIndex + pageSize;

        $scope.pagination.totalItems = totalItems;
        $scope.pagination.totalPages = totalPages;
        $scope.paginatedLeaves = ($scope.leaves || []).slice(startIndex, endIndex);
        $scope.visiblePages = getVisiblePages($scope.pagination.currentPage, totalPages);
    }

    function buildLeavePayload(model) {
        var source = model || {};
        var employeeId = toText(source.employee_id);
        var parsedId = parseInt(employeeId, 10);
        if (!isNaN(parsedId)) {
            employeeId = parsedId;
        }

        var leaveType = toText(source.leave_type);
        var status = toText(source.status) || "Pending";

        return {
            employee_id: employeeId,
            employees_id: employeeId,
            leave_type: leaveType,
            type: leaveType,
            start_date: toApiDate(source.start_date),
            end_date: toApiDate(source.end_date),
            reason: toText(source.reason),
            status: status,
            leave_status: status
        };
    }

    function resetForm() {
        $scope.isEditMode = false;
        $scope.editingLeaveId = null;
        $scope.leave = createEmptyLeave();
        if ($scope.employees.length > 0) {
            $scope.leave.employee_id = $scope.employees[0].id;
        }
    }

    function loadEmployees() {
        return requestWithFallback("get", "/employees")
            .then(function(res) {
                $scope.employees = extractCollection(res.data).map(normalizeEmployee);
                if (!$scope.leave.employee_id && $scope.employees.length > 0) {
                    $scope.leave.employee_id = $scope.employees[0].id;
                }
                if ($scope.employees.length === 0) {
                    $scope.leaveError = "No employees found.";
                }
            })
            .catch(function(error) {
                $scope.employees = [];
                $scope.leaveError = extractErrorMessage(error, "Failed to load employees.");
            });
    }

    $scope.loadLeaves = function() {
        return requestWithFallback("get", "/leaves")
            .then(function(res) {
                $scope.leaves = sortLeavesByIdDesc(extractCollection(res.data).map(normalizeLeave));
                refreshPagination();
            })
            .catch(function(error) {
                $scope.leaves = [];
                $scope.leaveError = extractErrorMessage(error, "Failed to load leave requests.");
                refreshPagination();
            });
    };

    $scope.setPage = function(page) {
        if (!page || page < 1 || page > $scope.pagination.totalPages) {
            return;
        }
        $scope.pagination.currentPage = page;
        refreshPagination();
    };

    $scope.prevPage = function() {
        $scope.setPage($scope.pagination.currentPage - 1);
    };

    $scope.nextPage = function() {
        $scope.setPage($scope.pagination.currentPage + 1);
    };

    $scope.changePageSize = function() {
        $scope.pagination.currentPage = 1;
        refreshPagination();
    };

    function createLeaveRequest(payload) {
        var createRequests = buildRequestFactories("post", "/leaves", payload);
        return runRequestChain(createRequests, 0);
    }

    function updateLeaveRequest(id, payload) {
        var updateRequests = []
            .concat(buildRequestFactories("put", "/leaves/" + id, payload))
            .concat(buildRequestFactories("post", "/leaves/" + id, angular.extend({}, payload, { _method: "PUT" })))
            .concat(buildRequestFactories("post", "/leaves/update/" + id, payload));
        return runRequestChain(updateRequests, 0);
    }

    function deleteLeaveRequest(id) {
        var deleteRequests = []
            .concat(buildRequestFactories("delete", "/leaves/" + id))
            .concat(buildRequestFactories("post", "/leaves/" + id, { _method: "DELETE" }))
            .concat(buildRequestFactories("post", "/leaves/delete/" + id, {}));
        return runRequestChain(deleteRequests, 0);
    }

    function approveLeaveRequest(id) {
        var approveRequests = []
            .concat(buildRequestFactories("put", "/leaves/approve/" + id, {}))
            .concat(buildRequestFactories("post", "/leaves/approve/" + id, {}))
            .concat(buildRequestFactories("patch", "/leaves/approve/" + id, {}))
            .concat(buildRequestFactories("put", "/leaves/" + id + "/approve", {}))
            .concat(buildRequestFactories("post", "/leaves/" + id + "/approve", {}))
            .concat(buildRequestFactories("patch", "/leaves/" + id + "/approve", {}));
        return runRequestChain(approveRequests, 0);
    }

    function rejectLeaveRequest(id) {
        var rejectRequests = []
            .concat(buildRequestFactories("put", "/leaves/reject/" + id, {}))
            .concat(buildRequestFactories("post", "/leaves/reject/" + id, {}))
            .concat(buildRequestFactories("patch", "/leaves/reject/" + id, {}))
            .concat(buildRequestFactories("put", "/leaves/" + id + "/reject", {}))
            .concat(buildRequestFactories("post", "/leaves/" + id + "/reject", {}))
            .concat(buildRequestFactories("patch", "/leaves/" + id + "/reject", {}));
        return runRequestChain(rejectRequests, 0);
    }

    function ensureDefaultEmployee(model) {
        if (!model) {
            return;
        }
        if (!model.employee_id && $scope.employees.length > 0) {
            model.employee_id = $scope.employees[0].id;
        }
    }

    function validatePayload(payload) {
        if (!payload.employee_id) {
            $scope.leaveError = "Please select employee.";
            return false;
        }
        if (!payload.leave_type || !payload.start_date || !payload.end_date || !payload.status) {
            $scope.leaveError = "Please fill all required fields.";
            return false;
        }
        return true;
    }

    $scope.openCreateModal = function() {
        $scope.leaveError = "";
        $scope.showEditModal = false;
        $scope.isEditMode = false;
        $scope.editingLeaveId = null;
        $scope.createLeaveModel = createEmptyLeave();
        ensureDefaultEmployee($scope.createLeaveModel);
        $scope.showCreateModal = true;
    };

    $scope.closeCreateModal = function() {
        $scope.showCreateModal = false;
        $scope.createLeaveModel = createEmptyLeave();
        ensureDefaultEmployee($scope.createLeaveModel);
    };

    $scope.openEditModal = function(item) {
        if (!item || !item.id) {
            return;
        }

        var normalized = normalizeLeave(item);
        $scope.leaveError = "";
        $scope.showCreateModal = false;
        $scope.showEditModal = true;
        $scope.isEditMode = true;
        $scope.editingLeaveId = normalized.id;
        $scope.editLeaveModel = {
            employee_id: normalized.employee_id,
            leave_type: normalized.leave_type,
            start_date: normalized.start_date,
            end_date: normalized.end_date,
            reason: normalized.reason,
            status: toText(normalized.status) || "Pending"
        };
        ensureDefaultEmployee($scope.editLeaveModel);
    };

    $scope.closeEditModal = function() {
        $scope.showEditModal = false;
        $scope.isEditMode = false;
        $scope.editingLeaveId = null;
        $scope.editLeaveModel = createEmptyLeave();
        ensureDefaultEmployee($scope.editLeaveModel);
    };

    $scope.submitCreateLeave = function() {
        var payload = buildLeavePayload($scope.createLeaveModel);
        if (!validatePayload(payload)) {
            return;
        }

        $scope.leaveError = "";
        return createLeaveRequest(payload)
            .then(function() {
                $scope.closeCreateModal();
                return $scope.loadLeaves();
            })
            .catch(function(error) {
                $scope.leaveError = extractErrorMessage(error, "Create leave request failed.");
            });
    };

    $scope.submitEditLeave = function() {
        if (!$scope.editingLeaveId) {
            $scope.leaveError = "Invalid leave ID.";
            return;
        }

        var payload = buildLeavePayload($scope.editLeaveModel);
        if (!validatePayload(payload)) {
            return;
        }

        $scope.leaveError = "";
        return updateLeaveRequest($scope.editingLeaveId, payload)
            .then(function() {
                $scope.closeEditModal();
                return $scope.loadLeaves();
            })
            .catch(function(error) {
                $scope.leaveError = extractErrorMessage(error, "Update leave request failed.");
            });
    };

    $scope.deleteLeave = function(item) {
        var id = item && item.id ? item.id : $scope.editingLeaveId;
        if (!id) {
            return;
        }
        if (!$window.confirm("តើអ្នកពិតជាចង់លុបសំណើច្បាប់ឈប់សម្រាកនេះមែនទេ?")) {
            return;
        }

        $scope.leaveError = "";
        return deleteLeaveRequest(id)
            .then(function() {
                if ($scope.showEditModal && String($scope.editingLeaveId) === String(id)) {
                    $scope.closeEditModal();
                }
                return $scope.loadLeaves();
            })
            .catch(function(error) {
                $scope.leaveError = extractErrorMessage(error, "Delete leave request failed.");
            });
    };

    // Backward-compatible handlers used by older markup.
    $scope.submitLeave = function() {
        if ($scope.isEditMode) {
            return $scope.submitEditLeave();
        }
        return $scope.submitCreateLeave();
    };

    $scope.startEdit = function(item) {
        return $scope.openEditModal(item);
    };

    $scope.cancelEdit = function() {
        return $scope.closeEditModal();
    };

    $scope.isPending = function(status) {
        return toText(status).toLowerCase() === "pending";
    };

    $scope.statusClass = function(status) {
        var key = toText(status).toLowerCase();
        if (key === "approved") {
            return "bg-emerald-100 text-emerald-700";
        }
        if (key === "rejected") {
            return "bg-red-100 text-red-700";
        }
        return "bg-yellow-100 text-yellow-700";
    };

    $scope.approve = function(id) {
        return approveLeaveRequest(id)
            .then(function() {
                return $scope.loadLeaves();
            })
            .catch(function(error) {
                $scope.leaveError = extractErrorMessage(error, "Failed to approve leave request.");
            });
    };

    $scope.reject = function(id) {
        return rejectLeaveRequest(id)
            .then(function() {
                return $scope.loadLeaves();
            })
            .catch(function(error) {
                $scope.leaveError = extractErrorMessage(error, "Failed to reject leave request.");
            });
    };

    $q.all([loadEmployees(), $scope.loadLeaves()]).finally(function() {
        if (!$scope.leave.employee_id && $scope.employees.length > 0) {
            $scope.leave.employee_id = $scope.employees[0].id;
        }
        ensureDefaultEmployee($scope.createLeaveModel);
        ensureDefaultEmployee($scope.editLeaveModel);
        refreshPagination();
    });
});
