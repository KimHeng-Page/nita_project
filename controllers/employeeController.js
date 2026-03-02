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
    $scope.activeDepartmentNameOptions = [];
    $scope.activeDepartmentDescriptionOptions = [];
    $scope.departmentRecords = [];
    var alertSpeechGestureHandler = null;
    var alertAudio = null;
    var originalAlertFn = (typeof $window.alert === "function") ? $window.alert : null;
    var originalConfirmFn = (typeof $window.confirm === "function") ? $window.confirm : null;
    var nativeAlert = originalAlertFn ? originalAlertFn.bind($window) : null;
    var nativeConfirm = originalConfirmFn ? originalConfirmFn.bind($window) : null;

    function renderLucideIcons(){
        $timeout(function(){
            if ($window.lucide && typeof $window.lucide.createIcons === "function") {
                $window.lucide.createIcons();
            }
        }, 0);
    }

    function clearAlertSpeechGestureHandler(){
        if (!alertSpeechGestureHandler || !$window.document) {
            return;
        }
        $window.document.removeEventListener("click", alertSpeechGestureHandler, true);
        $window.document.removeEventListener("touchstart", alertSpeechGestureHandler, true);
        $window.document.removeEventListener("keydown", alertSpeechGestureHandler, true);
        alertSpeechGestureHandler = null;
    }

    function queueAlertSpeechOnFirstGesture(text){
        if (alertSpeechGestureHandler || !$window.document) {
            return;
        }

        alertSpeechGestureHandler = function(){
            clearAlertSpeechGestureHandler();
            speakKhmerAlert(text);
        };

        $window.document.addEventListener("click", alertSpeechGestureHandler, true);
        $window.document.addEventListener("touchstart", alertSpeechGestureHandler, true);
        $window.document.addEventListener("keydown", alertSpeechGestureHandler, true);
    }

    function playKhmerAudioFallback(text){
        try {
            var message = String(text || "").trim();
            if (!message || !$window.Audio) {
                return false;
            }

            var ttsUrl = "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=km&q=" + encodeURIComponent(message);
            if (!alertAudio) {
                alertAudio = new $window.Audio();
                alertAudio.preload = "auto";
            }

            alertAudio.src = ttsUrl;
            var playPromise = alertAudio.play();
            if (playPromise && typeof playPromise.catch === "function") {
                playPromise.catch(function(){
                    queueAlertSpeechOnFirstGesture(message);
                });
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    function speakKhmerAlert(text, attempt){
        try {
            if (!$window.speechSynthesis || !$window.SpeechSynthesisUtterance) {
                if (!playKhmerAudioFallback(text)) {
                    queueAlertSpeechOnFirstGesture(text);
                }
                return;
            }

            attempt = attempt || 0;
            var message = String(text || "").trim();
            if (!message) {
                return;
            }

            var synth = $window.speechSynthesis;
            var voices = synth.getVoices();

            if ((!voices || !voices.length) && attempt < 2) {
                $timeout(function(){
                    speakKhmerAlert(message, attempt + 1);
                }, 450, false);
                return;
            }

            var utterance = new $window.SpeechSynthesisUtterance(message);
            var started = false;
            var retried = false;
            var khmerVoice = null;
            var fallbackVoice = null;
            var i;

            for (i = 0; voices && i < voices.length; i++) {
                if (!fallbackVoice) {
                    fallbackVoice = voices[i];
                }
                if (voices[i].lang && voices[i].lang.toLowerCase().indexOf("km") === 0) {
                    khmerVoice = voices[i];
                    break;
                }
            }

            utterance.rate = 1;
            utterance.pitch = 1;
            utterance.volume = 1;

            if (khmerVoice) {
                utterance.voice = khmerVoice;
                utterance.lang = khmerVoice.lang || "km-KH";
            } else if (fallbackVoice) {
                utterance.voice = fallbackVoice;
                utterance.lang = fallbackVoice.lang || (($window.navigator && $window.navigator.language) || "en-US");
            } else {
                utterance.lang = (($window.navigator && $window.navigator.language) || "en-US");
            }

            utterance.onstart = function(){
                started = true;
                clearAlertSpeechGestureHandler();
            };

            utterance.onerror = function(){
                if (attempt < 2) {
                    speakKhmerAlert(message, attempt + 1);
                    return;
                }
                if (!playKhmerAudioFallback(message)) {
                    queueAlertSpeechOnFirstGesture(message);
                }
            };

            if (typeof synth.resume === "function") {
                synth.resume();
            }
            synth.cancel();
            synth.speak(utterance);

            $timeout(function(){
                if (started || retried) {
                    return;
                }
                retried = true;

                if (attempt < 2) {
                    speakKhmerAlert(message, attempt + 1);
                    return;
                }

                if (!playKhmerAudioFallback(message)) {
                    queueAlertSpeechOnFirstGesture(message);
                }
            }, 1000, false);
        } catch (e) {
            if (!playKhmerAudioFallback(text)) {
                queueAlertSpeechOnFirstGesture(text);
            }
        }
    }

    function alertWithKhmerSpeech(message){
        var text = String(message || "").trim();
        if (nativeAlert) {
            nativeAlert(text);
        }
        speakKhmerAlert(text);
    }

    function extractApiErrorMessage(error, fallback){
        var data = error && error.data ? error.data : null;
        if (data && data.message) {
            return data.message;
        }
        if (data && data.error) {
            return data.error;
        }
        if (data && data.errors && typeof data.errors === "object") {
            var parts = [];
            Object.keys(data.errors).forEach(function(key){
                var value = data.errors[key];
                if (angular.isArray(value)) {
                    value.forEach(function(msg){
                        if (msg) {
                            parts.push(String(msg));
                        }
                    });
                } else if (value) {
                    parts.push(String(value));
                }
            });
            if (parts.length) {
                return parts.join(" ");
            }
        }
        return fallback;
    }

    function confirmWithKhmerSpeech(message){
        var text = String(message || "").trim();
        var result = nativeConfirm ? nativeConfirm(text) : false;
        speakKhmerAlert(text);
        return result;
    }

    if (originalAlertFn) {
        $window.alert = alertWithKhmerSpeech;
    }
    if (originalConfirmFn) {
        $window.confirm = confirmWithKhmerSpeech;
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

    function extractArray(payload){
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

    function normalizeDepartmentStatus(status){
        if (status === true || status === 1 || status === "1") {
            return "active";
        }
        if (status === false || status === 0 || status === "0") {
            return "inactive";
        }
        var text = String(status || "").trim().toLowerCase();
        return (text === "active" || text === "on" || text === "enabled" || text === "true") ? "active" : "inactive";
    }

    function buildActiveDepartmentNameOptions(records){
        var map = {};
        (records || []).forEach(function(item){
            if (normalizeDepartmentStatus(item && item.status) !== "active") {
                return;
            }
            var name = String((item && item.name) || "").trim();
            if (!name) {
                return;
            }
            var key = name.toLowerCase();
            if (!map[key]) {
                map[key] = { id: item.id || key, name: name };
            }
        });
        return Object.keys(map).map(function(key){ return map[key]; });
    }

    function refreshPositionOptionsByDepartment(){
        var selectedName = String(($scope.newEmployee && $scope.newEmployee.department) || "").trim().toLowerCase();
        var map = {};
        var options = [];

        ($scope.departmentRecords || []).forEach(function(item){
            if (normalizeDepartmentStatus(item && item.status) !== "active") {
                return;
            }
            var name = String((item && item.name) || "").trim().toLowerCase();
            if (!selectedName || name !== selectedName) {
                return;
            }
            var description = String((item && item.description) || "").trim();
            if (!description) {
                return;
            }
            var key = description.toLowerCase();
            if (!map[key]) {
                map[key] = true;
                options.push({ id: item.id || key, description: description });
            }
        });

        $scope.activeDepartmentDescriptionOptions = options;

        if (!$scope.isEditMode && options.length && !($scope.newEmployee && $scope.newEmployee.position)) {
            $scope.newEmployee.position = options[0].description;
        }
    }

    function loadDepartmentOptions(){
        return $http.get("/api/departments")
            .then(function(response){
                $scope.departmentRecords = extractArray(response.data);
                $scope.activeDepartmentNameOptions = buildActiveDepartmentNameOptions($scope.departmentRecords);
                refreshPositionOptionsByDepartment();
            })
            .catch(function(){
                $scope.departmentRecords = [];
                $scope.activeDepartmentNameOptions = [];
                $scope.activeDepartmentDescriptionOptions = [];
            });
    }

    $scope.onDepartmentChange = function(){
        if (!$scope.isEditMode) {
            $scope.newEmployee.position = "";
        }
        refreshPositionOptionsByDepartment();
    };

    $scope.openCreateModal = function(){
        $scope.newEmployee = createEmptyEmployee();
        $scope.isEditMode = false;
        $scope.editEmployeeId = null;
        $scope.createError = "";
        $scope.showCreateModal = true;
        refreshPositionOptionsByDepartment();
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
            $scope.createError = extractApiErrorMessage(error, "Create employee failed.");
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
            $scope.createError = extractApiErrorMessage(error, "Update employee failed.");
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

    $scope.$on("$destroy", function(){
        clearAlertSpeechGestureHandler();
        if (originalAlertFn) {
            $window.alert = originalAlertFn;
        }
        if (originalConfirmFn) {
            $window.confirm = originalConfirmFn;
        }
    });

});
