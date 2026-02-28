angular.module("hrApp").controller("AttendanceController", function($scope, $http, $filter, $window, $q) {
    var API_BASE = "/api";

    $scope.attendances = [];
    $scope.employees = [];
    $scope.attendanceSearch = "";
    $scope.attendanceError = "";
    $scope.isLoadingAttendance = false;
    $scope.filteredAttendances = [];
    $scope.paginatedAttendances = [];
    $scope.pagination = {
        currentPage: 1,
        pageSize: 10,
        pageSizeOptions: [5, 10, 20, 50],
        totalItems: 0,
        totalPages: 1
    };
    $scope.visiblePages = [];

    $scope.showCreateModal = false;
    $scope.showEditModal = false;
    $scope.createAttendance = createEmptyAttendance();
    $scope.editAttendance = null;
    $scope.editAttendanceOriginal = null;

    function createEmptyAttendance() {
        return {
            id: null,
            employees_id: "",
            employee_name: "",
            checkIn: getNowDateTimeLocal(),
            checkout: "",
            status: "active"
        };
    }

    function getNowDateTimeLocal() {
        var d = new Date();
        var pad = function(n) { return String(n).padStart(2, "0"); };
        return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
    }

    function formatDateForApi(date) {
        var pad = function(n) { return String(n).padStart(2, "0"); };
        return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + " " + pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":00";
    }

    function formatDateForInput(date) {
        var pad = function(n) { return String(n).padStart(2, "0"); };
        return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + "T" + pad(date.getHours()) + ":" + pad(date.getMinutes());
    }

    function toText(value) {
        if (value === undefined || value === null) {
            return "";
        }
        return String(value).trim();
    }

    function extractCollection(payload) {
        if (angular.isArray(payload)) {
            return payload;
        }
        if (payload && angular.isArray(payload.attendances)) {
            return payload.attendances;
        }
        if (payload && angular.isArray(payload.data)) {
            return payload.data;
        }
        if (payload && payload.data && angular.isArray(payload.data.attendances)) {
            return payload.data.attendances;
        }
        if (payload && payload.data && angular.isArray(payload.data.data)) {
            return payload.data.data;
        }
        if (payload && angular.isArray(payload.result)) {
            return payload.result;
        }
        return [];
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

    function getAttendanceSearchText(att) {
        if (!att) {
            return "";
        }
        return [
            toText(att.id),
            toText(att.employees_id),
            toText(att.employee_name),
            toText(att.checkIn),
            toText(att.checkout),
            toText(att.status)
        ].join(" ").toLowerCase();
    }

    function refreshAttendancePagination() {
        var searchTerm = toText($scope.attendanceSearch).toLowerCase();
        var list = $scope.attendances || [];
        var filtered = !searchTerm ? list.slice() : list.filter(function(att) {
            return getAttendanceSearchText(att).indexOf(searchTerm) !== -1;
        });

        $scope.filteredAttendances = filtered;

        var pageSize = Number($scope.pagination.pageSize) || 10;
        var totalItems = filtered.length;
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
        $scope.paginatedAttendances = filtered.slice(startIndex, endIndex);
        $scope.visiblePages = getVisiblePages($scope.pagination.currentPage, totalPages);
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

    function normalizeEmployee(item) {
        var source = item || {};
        var id = toText(source.id);
        return {
            id: id,
            fullname: toText(source.fullname || source.full_name || source.name) || "-"
        };
    }

    function buildEmployeeMap(items) {
        var map = {};
        (items || []).forEach(function(emp) {
            if (emp && emp.id !== undefined && emp.id !== null) {
                map[String(emp.id)] = emp;
            }
        });
        return map;
    }

    function toDateTimeInput(value) {
        var text = toText(value);
        if (!text) {
            return "";
        }

        var parsed = new Date(text);
        if (!isNaN(parsed.getTime())) {
            return formatDateForInput(parsed);
        }

        if (text.indexOf("T") > 0) {
            return text.substring(0, 16);
        }
        if (text.indexOf(" ") > 0) {
            return text.substring(0, 16).replace(" ", "T");
        }
        return "";
    }

    function fromDateTimeInput(value) {
        var text = toText(value);
        if (!text) {
            return null;
        }

        var parsed = new Date(text);
        if (!isNaN(parsed.getTime())) {
            return formatDateForApi(parsed);
        }

        if (text.length === 16) {
            var parsedLocal = new Date(text);
            if (!isNaN(parsedLocal.getTime())) {
                return formatDateForApi(parsedLocal);
            }
            return text.replace("T", " ") + ":00";
        }
        return text.replace("T", " ");
    }

    function inferStatusFromTimes(checkInValue, checkoutValue) {
        var checkInText = toText(checkInValue);
        var checkoutText = toText(checkoutValue);
        if (!checkoutText) {
            return "active";
        }
        if (!checkInText) {
            return "inactive";
        }

        var inDate = new Date(checkInText);
        var outDate = new Date(checkoutText);
        if (!isNaN(inDate.getTime()) && !isNaN(outDate.getTime()) && outDate.getTime() <= inDate.getTime()) {
            return "active";
        }
        return "inactive";
    }

    function normalizeAttendance(item, employeeMap, fallbackIndex) {
        var source = item || {};
        var employeesId = toText(source.employees_id || source.employee_id || source.employeeId || (source.employee && source.employee.id) || "");

        var employeeName = toText(
            source.employee_name ||
            source.employeeName ||
            source.fullname ||
            source.name ||
            (source.employee && (source.employee.fullname || source.employee.full_name || source.employee.name))
        );

        if (!employeeName && employeesId && employeeMap[employeesId]) {
            employeeName = toText(employeeMap[employeesId].fullname);
        }

        var resolvedId = source.id || source.attendance_id || source.attendanceId || fallbackIndex;
        var checkIn = toText(source.checkIn || source.check_in || source.check_in_time || source.checkin || source.in_time);
        var checkout = toText(source.checkout || source.checkOut || source.check_out || source.check_out_time || source.out_time);
        var status = toText(source.status);

        if (!status) {
            status = inferStatusFromTimes(checkIn, checkout);
        }

        return {
            id: resolvedId,
            employees_id: employeesId,
            employee_name: employeeName || "-",
            checkIn: checkIn,
            checkout: checkout,
            status: status
        };
    }

    function resolveEmployeesId(rawValue) {
        if (rawValue && typeof rawValue === "object" && rawValue.id !== undefined && rawValue.id !== null) {
            return toText(rawValue.id);
        }
        return toText(rawValue);
    }

    function buildAttendancePayload(form) {
        var employeesId = resolveEmployeesId(form.employees_id);
        var parsedId = parseInt(employeesId, 10);
        if (!isNaN(parsedId)) {
            employeesId = parsedId;
        }
        var checkInValue = fromDateTimeInput(form.checkIn);
        var checkoutValue = fromDateTimeInput(form.checkout);
        if (!checkInValue) {
            checkInValue = formatDateForApi(new Date());
        }
        if (!checkoutValue) {
           
            checkoutValue = checkInValue;
        }
        var statusValue = toText(form.status);
        var employeeNameValue = toText(form.employee_name);

        return {
            employees_id: employeesId,
            employee_id: employeesId,
            employee_name: employeeNameValue,
            checkIn: checkInValue,
            checkin: checkInValue,
            checkout: checkoutValue,
            checkOut: checkoutValue,
            check_in: checkInValue,
            check_in_time: checkInValue,
            check_out: checkoutValue,
            check_out_time: checkoutValue,
            out_time: checkoutValue,
            status: statusValue
        };
    }

    function shouldTryFallback(error) {
        var status = error && error.status;
        return status === 0 || status === 400 || status === 404 || status === 405 || status === 422 || status === 500;
    }

    function runRequestChain(requestFactories, index, lastError) {
        if (index >= requestFactories.length) {
            return $q.reject(lastError || { message: "Request failed." });
        }

        return requestFactories[index]()
            .catch(function(error) {
                if (!shouldTryFallback(error)) {
                    return $q.reject(error);
                }
                return runRequestChain(requestFactories, index + 1, error);
            });
    }

    function loadEmployees() {
        return $http.get(API_BASE + "/employees")
            .then(function(res) {
                var list = extractCollection(res.data).map(normalizeEmployee);
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
                $scope.employees = list;
            })
            .catch(function() {
                $scope.employees = [];
            });
    }

    function loadAttendance() {
        $scope.isLoadingAttendance = true;
        return $http.get(API_BASE + "/attendances")
            .then(function(res) {
                var records = extractCollection(res.data);
                var employeeMap = buildEmployeeMap($scope.employees);
                var normalized = records.map(function(item, index) {
                    return normalizeAttendance(item, employeeMap, index + 1);
                });
                normalized.sort(function(a, b) {
                    return Number(b.id || 0) - Number(a.id || 0);
                });
                $scope.attendances = normalized;
                refreshAttendancePagination();
                $scope.attendanceError = "";
            })
            .catch(function(error) {
                $scope.attendances = [];
                refreshAttendancePagination();
                $scope.attendanceError = extractErrorMessage(error, "Failed to load attendances.");
            })
            .finally(function() {
                $scope.isLoadingAttendance = false;
            });
    }

    $scope.getStatusText = function(att) {
        var text = toText(att && att.status);
        if (text) {
            return text;
        }
        return inferStatusFromTimes(att && att.checkIn, att && att.checkout);
    };

    $scope.setPage = function(page) {
        if (!page || page < 1 || page > $scope.pagination.totalPages) {
            return;
        }
        $scope.pagination.currentPage = page;
        refreshAttendancePagination();
    };

    $scope.prevPage = function() {
        $scope.setPage($scope.pagination.currentPage - 1);
    };

    $scope.nextPage = function() {
        $scope.setPage($scope.pagination.currentPage + 1);
    };

    $scope.changePageSize = function() {
        $scope.pagination.currentPage = 1;
        refreshAttendancePagination();
    };

    $scope.isStatusActive = function(att) {
        var text = toText($scope.getStatusText(att)).toLowerCase();
        return text === "active" || text === "present" || text === "working" || text === "on" || text === "1" || text === "true";
    };

    $scope.syncEmployeeName = function(target) {
        if (!target) {
            return;
        }
        var targetId = resolveEmployeesId(target.employees_id);
        target.employees_id = targetId;

        var found = null;
        for (var i = 0; i < $scope.employees.length; i++) {
            if (toText($scope.employees[i].id) === targetId) {
                found = $scope.employees[i];
                break;
            }
        }
        if (found) {
            target.employee_name = found.fullname;
        }
    };

    $scope.openCreateModal = function() {
        $scope.createAttendance = createEmptyAttendance();
        if ($scope.employees.length > 0) {
            $scope.createAttendance.employees_id = toText($scope.employees[0].id);
            $scope.syncEmployeeName($scope.createAttendance);
        }
        $scope.showCreateModal = true;
    };

    $scope.closeCreateModal = function() {
        $scope.showCreateModal = false;
        $scope.createAttendance = createEmptyAttendance();
    };

    $scope.submitCreateAttendance = function() {
        $scope.createAttendance.employees_id = resolveEmployeesId($scope.createAttendance.employees_id);
        if (!$scope.createAttendance.employees_id) {
            $scope.attendanceError = "Please select employee.";
            return;
        }
        if (!$scope.createAttendance.checkIn) {
            $scope.attendanceError = "Please select check in time.";
            return;
        }
        $scope.syncEmployeeName($scope.createAttendance);

        var payload = buildAttendancePayload($scope.createAttendance);
        var snakePayload = angular.copy(payload);

        var createRequests = [
            function() { return $http.post(API_BASE + "/attendances", payload); },
            function() { return $http.post(API_BASE + "/attendances", snakePayload); }
        ];

        $scope.attendanceError = "";

        return runRequestChain(createRequests, 0)
            .then(function() {
                $scope.closeCreateModal();
                return loadAttendance();
            })
            .catch(function(error) {
                $scope.attendanceError = extractErrorMessage(error, "Create attendance failed.");
            });
    };

    $scope.openEditModal = function(attendance) {
        if (!attendance) {
            return;
        }
        $scope.editAttendanceOriginal = angular.copy(attendance);
        $scope.editAttendance = {
            id: attendance.id,
            employees_id: toText(attendance.employees_id),
            employee_name: attendance.employee_name,
            checkIn: toDateTimeInput(attendance.checkIn),
            checkout: toDateTimeInput(attendance.checkout),
            status: toText(attendance.status) || (attendance.checkout ? "inactive" : "active")
        };
        $scope.showEditModal = true;
    };

    $scope.closeEditModal = function() {
        $scope.showEditModal = false;
        $scope.editAttendance = null;
        $scope.editAttendanceOriginal = null;
    };

    $scope.submitEditAttendance = function() {
        if (!$scope.editAttendance || !$scope.editAttendance.id) {
            $scope.attendanceError = "Invalid attendance item.";
            return;
        }
        $scope.editAttendance.employees_id = resolveEmployeesId($scope.editAttendance.employees_id);
        if (!$scope.editAttendance.employees_id) {
            $scope.attendanceError = "Please select employee.";
            return;
        }
        if (!$scope.editAttendance.checkIn) {
            $scope.attendanceError = "Please select check in time.";
            return;
        }
        $scope.syncEmployeeName($scope.editAttendance);

        var payload = buildAttendancePayload($scope.editAttendance);
        var attendanceId = $scope.editAttendance.id;
        $scope.attendanceError = "";

        return updateAttendanceById(attendanceId, payload)
            .then(function() {
                $scope.closeEditModal();
                return loadAttendance();
            })
            .catch(function(error) {
                $scope.attendanceError = extractErrorMessage(error, "Update attendance failed.");
            });
    };

    function updateAttendanceById(attendanceId, payload) {
        var snakePayload = angular.copy(payload);
        var putRequests = [
            function() { return $http.put(API_BASE + "/attendances/" + attendanceId, payload); },
            function() { return $http.put(API_BASE + "/attendances/" + attendanceId, snakePayload); },
            function() { return $http.post(API_BASE + "/attendances/" + attendanceId, angular.extend({}, payload, {_method: "PUT"})); }
        ];

        return runRequestChain(putRequests, 0);
    }

    $scope.toggleAttendanceStatus = function(att) {
        if (!att || !att.id || att._statusUpdating) {
            return;
        }

        var turningOn = !$scope.isStatusActive(att);
        var nowInput = getNowDateTimeLocal();
        var existingCheckIn = toDateTimeInput(att.checkIn) || nowInput;
        var nextCheckIn = turningOn ? nowInput : existingCheckIn;

        // Some APIs validate checkout as required even for active records.
        // Use checkIn-equivalent checkout for "on", and current time for "off".
        var nextCheckout = turningOn ? nextCheckIn : nowInput;

        var payload = buildAttendancePayload({
            employees_id: resolveEmployeesId(att.employees_id),
            employee_name: toText(att.employee_name),
            checkIn: nextCheckIn,
            checkout: nextCheckout,
            status: turningOn ? "active" : "inactive"
        });

        att._statusUpdating = true;
        $scope.attendanceError = "";

        return updateAttendanceById(att.id, payload)
            .then(function() {
                return loadAttendance();
            })
            .catch(function(error) {
                $scope.attendanceError = extractErrorMessage(error, "Update status failed.");
            })
            .finally(function() {
                att._statusUpdating = false;
            });
    };

    $scope.deleteAttendance = function(attendance) {
        var id = attendance && attendance.id;
        if (!id) {
            return;
        }

        if (!$window.confirm("តើអ្នកប្រាកដជាចង់លុបទិន្នន័យវត្តមាននេះមែនទេ?")) {
            return;
        }

        $scope.attendanceError = "";
        return $http.delete(API_BASE + "/attendances/" + id)
            .then(function() {
                if ($scope.editAttendance && String($scope.editAttendance.id) === String(id)) {
                    $scope.closeEditModal();
                }
                return loadAttendance();
            })
            .catch(function(error) {
                $scope.attendanceError = extractErrorMessage(error, "Delete attendance failed.");
            });
    };

    $scope.$watch("attendanceSearch", function() {
        $scope.pagination.currentPage = 1;
        refreshAttendancePagination();
    });

    loadEmployees().finally(function() {
        loadAttendance();
    });
});
