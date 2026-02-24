angular.module("hrApp").controller("AttendanceController", function($scope, $http, $filter, $window, $q) {
    var API_BASE = "http://127.0.0.1:8000/api";

    $scope.attendances = [];
    $scope.employees = [];
    $scope.attendanceSearch = "";
    $scope.attendanceError = "";
    $scope.isLoadingAttendance = false;

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
        if (payload && angular.isArray(payload.data)) {
            return payload.data;
        }
        if (payload && payload.data && angular.isArray(payload.data.data)) {
            return payload.data.data;
        }
        if (payload && angular.isArray(payload.result)) {
            return payload.result;
        }
        return [];
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

        if (text.indexOf("T") > 0) {
            return text.substring(0, 16);
        }
        if (text.indexOf(" ") > 0) {
            return text.substring(0, 16).replace(" ", "T");
        }

        var parsed = new Date(text);
        if (!isNaN(parsed.getTime())) {
            var pad = function(n) { return String(n).padStart(2, "0"); };
            return parsed.getFullYear() + "-" + pad(parsed.getMonth() + 1) + "-" + pad(parsed.getDate()) + "T" + pad(parsed.getHours()) + ":" + pad(parsed.getMinutes());
        }
        return "";
    }

    function fromDateTimeInput(value) {
        var text = toText(value);
        if (!text) {
            return "";
        }
        if (text.length === 16) {
            return text.replace("T", " ") + ":00";
        }
        return text.replace("T", " ");
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
            status = checkout ? "inactive" : "active";
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
        var statusValue = toText(form.status);
        var employeeNameValue = toText(form.employee_name);

        return {
            employees_id: employeesId,
            employee_id: employeesId,
            employee_name: employeeNameValue,
            checkIn: checkInValue,
            checkout: checkoutValue,
            check_in: checkInValue,
            check_out: checkoutValue,
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
                $scope.employees = $filter("orderBy")(list, "fullname");
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
                $scope.attendanceError = "";
            })
            .catch(function(error) {
                $scope.attendances = [];
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
        return toText(att && att.checkout) ? "inactive" : "active";
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
        var snakePayload = angular.copy(payload);

        var attendanceId = $scope.editAttendance.id;
        $scope.attendanceError = "";

        var putRequests = [
            function() { return $http.put(API_BASE + "/attendances/" + attendanceId, payload); },
            function() { return $http.put(API_BASE + "/attendances/" + attendanceId, snakePayload); },
            function() { return $http.post(API_BASE + "/attendances/" + attendanceId, angular.extend({_method: "PUT"}, payload)); }
        ];

        return runRequestChain(putRequests, 0)
            .then(function() {
                $scope.closeEditModal();
                return loadAttendance();
            })
            .catch(function(error) {
                $scope.attendanceError = extractErrorMessage(error, "Update attendance failed.");
            });
    };

    $scope.deleteAttendance = function(attendance) {
        var id = attendance && attendance.id;
        if (!id) {
            return;
        }

        if (!$window.confirm("Are you sure you want to delete this attendance record?")) {
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

    loadEmployees().finally(function() {
        loadAttendance();
    });
});
