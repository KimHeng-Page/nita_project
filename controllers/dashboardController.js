app.controller("DashboardController", function($scope, $timeout, $window, $interval, $http, $q, EmployeeService){
    var DASHBOARD_WELCOME_KEY = "show_dashboard_welcome";

    $scope.isLoadingDashboard = true;
    $scope.dashboardError = "";
    $scope.dashboardStats = {
        totalEmployees: 0,
        totalLeaves: 0,
        totalDepartments: 0,
        totalPositions: 0
    };
    $scope.hasDepartmentData = false;
    $scope.hasPositionData = false;
    $scope.showWelcomeAlert = false;
    $scope.welcomeAlertText = "";
    $scope.slideImages = [
        {
            src: "images/banner.png",
            alt: "សាកលវិទ្យាល័យអាស៊ីអឺរ៉ុប USEA",
            caption: "សាកលវិទ្យាល័យអាស៊ីអឺរ៉ុប USEA"
        },
        {
            src: "images/acca.webp",
            alt: "កម្មវិធី ACCA",
            caption: "កម្មវិធី ACCA"
        },
    ];
    $scope.activeSlideIndex = 0;

    var departmentChart = null;
    var positionChart = null;
    var slideTimer = null;
    var welcomeAlertTimer = null;
    var welcomeSpeechGestureHandler = null;

    function clearWelcomeAlertTimer(){
        if (!welcomeAlertTimer) {
            return;
        }
        $timeout.cancel(welcomeAlertTimer);
        welcomeAlertTimer = null;
    }

    function scheduleWelcomeAlertAutoClose(){
        clearWelcomeAlertTimer();
        welcomeAlertTimer = $timeout(function(){
            $scope.showWelcomeAlert = false;
        }, 6000);
    }

    function destroyCharts(){
        if (departmentChart) {
            departmentChart.destroy();
            departmentChart = null;
        }
        if (positionChart) {
            positionChart.destroy();
            positionChart = null;
        }
    }

    function normalizeLabel(value, fallback){
        var text = (value === undefined || value === null) ? "" : String(value).trim();
        return text ? text : fallback;
    }

    function countBy(array, mapper, fallback){
        var map = {};
        array.forEach(function(item){
            var key = normalizeLabel(mapper(item), fallback);
            map[key] = (map[key] || 0) + 1;
        });
        return map;
    }

    function toSortedEntries(map){
        return Object.keys(map)
            .map(function(key){
                return { label: key, value: map[key] };
            })
            .sort(function(a, b){
                if (b.value !== a.value) {
                    return b.value - a.value;
                }
                return a.label.localeCompare(b.label);
            });
    }

    function palette(size){
        var colors = [
            "rgba(59, 130, 246, 0.85)",
            "rgba(16, 185, 129, 0.85)",
            "rgba(234, 179, 8, 0.85)",
            "rgba(239, 68, 68, 0.85)",
            "rgba(20, 184, 166, 0.85)",
            "rgba(99, 102, 241, 0.85)",
            "rgba(249, 115, 22, 0.85)",
            "rgba(168, 85, 247, 0.85)"
        ];
        var result = [];
        for (var i = 0; i < size; i++) {
            result.push(colors[i % colors.length]);
        }
        return result;
    }

    function parseAge(value){
        var parsed = parseInt(value, 10);
        return isNaN(parsed) ? null : parsed;
    }

    function parseTotalValue(value){
        var parsed = parseInt(value, 10);
        return isNaN(parsed) ? null : parsed;
    }

    function getCurrentUserDisplayName(){
        try {
            var raw = $window.localStorage.getItem("auth_user");
            if (!raw) {
                return "អ្នកប្រើប្រាស់";
            }

            var user = JSON.parse(raw);
            var name = user && (user.fullname || user.full_name || user.name || user.username || user.email);
            name = (name === undefined || name === null) ? "" : String(name).trim();
            return name || "អ្នកប្រើប្រាស់";
        } catch (e) {
            return "អ្នកប្រើប្រាស់";
        }
    }

    function buildWelcomeText(){
        return "សូមស្វាគមន៍, " + getCurrentUserDisplayName();
    }

    function clearWelcomeSpeechGestureHandler(){
        if (!welcomeSpeechGestureHandler || !$window.document) {
            return;
        }
        $window.document.removeEventListener("click", welcomeSpeechGestureHandler, true);
        $window.document.removeEventListener("touchstart", welcomeSpeechGestureHandler, true);
        $window.document.removeEventListener("keydown", welcomeSpeechGestureHandler, true);
        welcomeSpeechGestureHandler = null;
    }

    function queueWelcomeSpeechOnFirstGesture(text){
        if (welcomeSpeechGestureHandler || !$window.document) {
            return;
        }

        welcomeSpeechGestureHandler = function(){
            clearWelcomeSpeechGestureHandler();
            speakKhmerNow(text);
        };

        $window.document.addEventListener("click", welcomeSpeechGestureHandler, true);
        $window.document.addEventListener("touchstart", welcomeSpeechGestureHandler, true);
        $window.document.addEventListener("keydown", welcomeSpeechGestureHandler, true);
    }

    function speakWelcomeText(text, onBlocked, attempt){
        try {
            if (!$window.speechSynthesis || !$window.SpeechSynthesisUtterance) {
                return false;
            }

            attempt = attempt || 0;
            var message = String(text || "").trim();
            if (!message) {
                return false;
            }

            var synth = $window.speechSynthesis;
            var utterance = new $window.SpeechSynthesisUtterance(message);
            var started = false;
            var retried = false;
            utterance.rate = 1;
            utterance.pitch = 1;
            utterance.volume = 1;

            var voices = synth.getVoices();
            var khmerVoice = null;
            var fallbackVoice = null;
            if (voices && voices.length) {
                for (var i = 0; i < voices.length; i++) {
                    if (!fallbackVoice) {
                        fallbackVoice = voices[i];
                    }
                    if (voices[i].lang && voices[i].lang.toLowerCase().indexOf("km") === 0) {
                        khmerVoice = voices[i];
                        break;
                    }
                }
            }

            utterance.text = message;
            if (attempt === 0 && khmerVoice) {
                utterance.voice = khmerVoice;
                utterance.lang = khmerVoice.lang || "km-KH";
            } else if (fallbackVoice) {
                utterance.voice = fallbackVoice;
                utterance.lang = fallbackVoice.lang || "";
            } else {
                utterance.lang = "";
            }

            utterance.onstart = function(){
                started = true;
                clearWelcomeSpeechGestureHandler();
            };

            utterance.onerror = function(){
                if (attempt === 0) {
                    speakWelcomeText(message, onBlocked, 1);
                    return;
                }
                if (typeof onBlocked === "function") {
                    onBlocked();
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

                if (attempt === 0) {
                    speakWelcomeText(message, onBlocked, 1);
                    return;
                }

                if (typeof onBlocked === "function") {
                    onBlocked();
                }
            }, 1000, false);

            return true;
        } catch (e) {
            return false;
        }
    }

    function speakKhmerNow(text){
        if (!speakWelcomeText(text, function(){
            queueWelcomeSpeechOnFirstGesture(text);
        })) {
            queueWelcomeSpeechOnFirstGesture(text);
        }
    }

    function showLoginWelcomeOnce(){
        var shouldShow = $window.localStorage.getItem(DASHBOARD_WELCOME_KEY) === "1";
        if (!shouldShow) {
            return;
        }

        var welcomeText = buildWelcomeText();
        $scope.welcomeAlertText = welcomeText;
        $scope.showWelcomeAlert = true;
        scheduleWelcomeAlertAutoClose();

        $window.localStorage.removeItem(DASHBOARD_WELCOME_KEY);
        queueWelcomeSpeechOnFirstGesture(welcomeText);
        speakKhmerNow(welcomeText);
    }

    $scope.dismissWelcomeAlert = function(){
        clearWelcomeSpeechGestureHandler();
        clearWelcomeAlertTimer();
        $scope.showWelcomeAlert = false;
    };

    $scope.speakWelcomeNow = function(){
        var text = $scope.welcomeAlertText || buildWelcomeText();
        speakKhmerNow(text);
    };

    function getSlideCount(){
        return angular.isArray($scope.slideImages) ? $scope.slideImages.length : 0;
    }

    $scope.nextSlide = function(skipRestart){
        var count = getSlideCount();
        if (!count) {
            return;
        }
        $scope.activeSlideIndex = ($scope.activeSlideIndex + 1) % count;
        if (!skipRestart) {
            restartSlideTimer();
        }
    };

    $scope.prevSlide = function(){
        var count = getSlideCount();
        if (!count) {
            return;
        }
        $scope.activeSlideIndex = ($scope.activeSlideIndex - 1 + count) % count;
        restartSlideTimer();
    };

    $scope.goToSlide = function(index){
        var count = getSlideCount();
        if (!count || index < 0 || index >= count) {
            return;
        }
        $scope.activeSlideIndex = index;
        restartSlideTimer();
    };

    function startSlideTimer(){
        if (slideTimer || getSlideCount() <= 1) {
            return;
        }
        slideTimer = $interval(function(){
            $scope.nextSlide(true);
        }, 4000);
    }

    function stopSlideTimer(){
        if (!slideTimer) {
            return;
        }
        $interval.cancel(slideTimer);
        slideTimer = null;
    }

    function restartSlideTimer(){
        stopSlideTimer();
        startSlideTimer();
    }

    $scope.pauseSlideTimer = function(){
        stopSlideTimer();
    };

    $scope.resumeSlideTimer = function(){
        startSlideTimer();
    };

    function extractEmployees(payload){
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

    function extractTotalEmployees(payload, employees){
        var total = null;

        if (payload) {
            total = parseTotalValue(payload.total);
        }

        if (total === null && payload && payload.meta) {
            total = parseTotalValue(payload.meta.total);
        }

        if (total === null && payload && payload.meta && payload.meta.pagination) {
            total = parseTotalValue(payload.meta.pagination.total);
        }

        if (total === null && payload && payload.data && payload.data.meta) {
            total = parseTotalValue(payload.data.meta.total);
        }

        if (total === null && payload && payload.data && payload.data.meta && payload.data.meta.pagination) {
            total = parseTotalValue(payload.data.meta.pagination.total);
        }

        return total === null ? employees.length : total;
    }

    function extractLeaves(payload){
        if (angular.isArray(payload)) {
            return payload;
        }
        if (payload && angular.isArray(payload.data)) {
            return payload.data;
        }
        if (payload && payload.data && angular.isArray(payload.data.data)) {
            return payload.data.data;
        }
        if (payload && angular.isArray(payload.leaves)) {
            return payload.leaves;
        }
        return [];
    }

    function extractTotalLeaves(payload, leaves){
        var total = null;

        if (payload) {
            total = parseTotalValue(payload.total);
        }
        if (total === null && payload && payload.meta) {
            total = parseTotalValue(payload.meta.total);
        }
        if (total === null && payload && payload.meta && payload.meta.pagination) {
            total = parseTotalValue(payload.meta.pagination.total);
        }
        if (total === null && payload && payload.data && payload.data.meta) {
            total = parseTotalValue(payload.data.meta.total);
        }
        if (total === null && payload && payload.data && payload.data.meta && payload.data.meta.pagination) {
            total = parseTotalValue(payload.data.meta.pagination.total);
        }

        return total === null ? leaves.length : total;
    }

    function loadLeavesSafe(){
        return $http.get("http://127.0.0.1:8000/api/leaves")
            .catch(function(){
                return $http.get("http://localhost:8000/api/leaves");
            })
            .catch(function(){
                return { data: [] };
            });
    }

    function renderDepartmentChart(entries){
        if (!$window.Chart) {
            return;
        }
        var canvas = document.getElementById("departmentChart");
        if (!canvas) {
            return;
        }

        var labels = entries.map(function(entry){ return entry.label; });
        var values = entries.map(function(entry){ return entry.value; });

        departmentChart = new $window.Chart(canvas, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    label: "Employees",
                    data: values,
                    backgroundColor: "rgba(59, 130, 246, 0.75)",
                    borderColor: "rgba(37, 99, 235, 1)",
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 }
                    }
                }
            }
        });
    }

    function renderPositionChart(entries){
        if (!$window.Chart) {
            return;
        }
        var canvas = document.getElementById("positionChart");
        if (!canvas) {
            return;
        }

        var labels = entries.map(function(entry){ return entry.label; });
        var values = entries.map(function(entry){ return entry.value; });

        positionChart = new $window.Chart(canvas, {
            type: "doughnut",
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: palette(values.length),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            boxWidth: 12
                        }
                    }
                }
            }
        });
    }

    function updateDashboard(employees, totalEmployees, totalLeaves){
        var departmentEntries = toSortedEntries(countBy(employees, function(emp){
            return emp.department;
        }, "Unknown"));
        var positionEntries = toSortedEntries(countBy(employees, function(emp){
            return emp.position;
        }, "Unknown"));

        var uniqueDepartments = {};
        var uniquePositions = {};

        employees.forEach(function(emp){
            uniqueDepartments[normalizeLabel(emp.department, "Unknown")] = true;
            uniquePositions[normalizeLabel(emp.position, "Unknown")] = true;
        });

        $scope.dashboardStats.totalEmployees = totalEmployees;
        $scope.dashboardStats.totalLeaves = totalLeaves;
        $scope.dashboardStats.totalDepartments = Object.keys(uniqueDepartments).length;
        $scope.dashboardStats.totalPositions = Object.keys(uniquePositions).length;
        $scope.hasDepartmentData = departmentEntries.length > 0;
        $scope.hasPositionData = positionEntries.length > 0;

        destroyCharts();
        $timeout(function(){
            if ($scope.hasDepartmentData) {
                renderDepartmentChart(departmentEntries);
            }
            if ($scope.hasPositionData) {
                renderPositionChart(positionEntries);
            }
        }, 0);
    }

    $q.all([EmployeeService.getAll(), loadLeavesSafe()])
        .then(function(results){
            var employeesPayload = results[0].data;
            var employees = extractEmployees(employeesPayload);
            var totalEmployees = extractTotalEmployees(employeesPayload, employees);

            var leavesPayload = results[1].data;
            var leaves = extractLeaves(leavesPayload);
            var totalLeaves = extractTotalLeaves(leavesPayload, leaves);

            updateDashboard(employees, totalEmployees, totalLeaves);
        })
        .catch(function(){
            $scope.dashboardError = "Failed to load dashboard data.";
            destroyCharts();
        })
        .finally(function(){
            $scope.isLoadingDashboard = false;
        });

    showLoginWelcomeOnce();
    startSlideTimer();

    $scope.$on("$destroy", function(){
        clearWelcomeSpeechGestureHandler();
        clearWelcomeAlertTimer();
        stopSlideTimer();
        destroyCharts();
    });
});


