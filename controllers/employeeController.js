app.controller("EmployeeController", function($scope, $location, $filter, $window, $timeout, $http, EmployeeService){

    $scope.employees = [];
    $scope.newEmployee = createEmptyEmployee();
    $scope.currentPage = 1;
    $scope.pageSize = 8;
    $scope.filteredEmployees = [];
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
        return $http.get("/api/departments")
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
        refreshPagination();
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
        var totalItems = ($scope.filteredEmployees && $scope.filteredEmployees.length) ? $scope.filteredEmployees.length : 0;
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

    $scope.getTotalPages = function(){
        var pages = Math.ceil($scope.filteredEmployees.length / $scope.pageSize);
        return pages > 0 ? pages : 1;
    };

    $scope.getPageNumbers = function(){
        return $scope.visiblePages;
    };

    $scope.getPaginatedEmployees = function(){
        var start = ($scope.pagination.currentPage - 1) * $scope.pagination.pageSize;
        return $scope.filteredEmployees.slice(start, start + $scope.pageSize);
    };

    function buildImageCandidates(image){
        var origin = window.location.origin || "";
        var pathname = window.location.pathname || "/";
        var appBasePath = pathname.replace(/[^/]*$/, "");
        var candidates = [];

        function toAppUrl(path) {
            var clean = String(path || "").replace(/^\/+/, "");
            return origin + appBasePath + clean;
        }

        function toRootUrl(path) {
            var clean = String(path || "").replace(/^\/+/, "");
            return origin + "/" + clean;
        }

        function addCandidate(url){
            if (!url) {
                return;
            }
            if (typeof url !== "string") {
                url = String(url);
            }
            url = url.trim();
            if (!url || url.indexOf("unsafe:") === 0) {
                return;
            }
            if (candidates.indexOf(url) === -1) {
                candidates.push(url);
            }
        }

        if (!image) {
            return candidates;
        }

        if (typeof image === "object" && image.url) {
            image = image.url;
        }
        image = String(image).replace(/\\/g, "/");
        image = image.replace(/^public\//, "");
        image = image.trim();

        // Normalize common backend disk-style paths to public web paths.
        image = image.replace(/^.*\/storage\/app\/public\//i, "storage/");
        image = image.replace(/^.*\/public\/storage\//i, "storage/");
        image = image.replace(/^.*\/public\/uploads\//i, "uploads/");
        image = image.replace(/^.*\/public\/images\//i, "images/");

        if (/^(https?:)?\/\//.test(image) || image.indexOf("data:") === 0 || image.indexOf("blob:") === 0) {
            if (image.indexOf("data:") === 0 || image.indexOf("blob:") === 0) {
                addCandidate(image);
                return candidates;
            }

            try {
                var parsed = new URL(image, origin || window.location.href);
                var host = (parsed.hostname || "").toLowerCase();
                var isLocalBackendHost = host === "127.0.0.1" || host === "localhost";
                var backendPath = String(parsed.pathname || "");
                backendPath = backendPath.replace(/\\/g, "/");

                if (isLocalBackendHost) {
                    backendPath = backendPath.replace(/^\/+api\/storage\//, "/storage/");
                    backendPath = backendPath.replace(/^\/+api\/uploads\//, "/uploads/");
                    backendPath = backendPath.replace(/^\/+api\/images\//, "/images/");
                    addCandidate(toRootUrl(backendPath));
                    addCandidate(toAppUrl(backendPath));
                }
            } catch (e) {
                // Keep original URL below.
            }

            addCandidate(image);
            return candidates;
        }

        if (image.indexOf("./") === 0) {
            image = image.substring(2);
        }

        if (image.indexOf("/api/storage/") === 0) {
            var fromApiStorage = image.replace(/^\/api\//, "");
            addCandidate(toRootUrl(fromApiStorage));
            addCandidate(toAppUrl(fromApiStorage));
            return candidates;
        }

        if (image.indexOf("api/storage/") === 0) {
            var relApiStorage = image.replace(/^api\//, "");
            addCandidate(toRootUrl(relApiStorage));
            addCandidate(toAppUrl(relApiStorage));
            return candidates;
        }

        if (image.indexOf("/images/") === 0) {
            addCandidate(toAppUrl(image));
            addCandidate(toRootUrl(image));
            return candidates;
        }

        if (
            image.indexOf("/storage/") === 0 ||
            image.indexOf("/uploads/") === 0
        ) {
            addCandidate(toRootUrl(image));
            addCandidate(toAppUrl(image));
            return candidates;
        }

        if (
            image.indexOf("storage/") === 0 ||
            image.indexOf("uploads/") === 0 ||
            image.indexOf("images/") === 0
        ) {
            if (image.indexOf("images/") === 0) {
                addCandidate(toAppUrl(image));
                addCandidate(toRootUrl(image));
                return candidates;
            }
            addCandidate(toRootUrl(image));
            addCandidate(toAppUrl(image));
            return candidates;
        }

        if (image.indexOf("/") === 0) {
            addCandidate(toAppUrl(image));
            addCandidate(toRootUrl(image));
            return candidates;
        }

        addCandidate(toRootUrl("storage/" + image));
        addCandidate(toAppUrl("storage/" + image));
        addCandidate(toRootUrl("uploads/" + image));
        addCandidate(toAppUrl("uploads/" + image));
        addCandidate(toRootUrl("images/" + image));
        addCandidate(toAppUrl("images/" + image));
        return candidates;
    }

    function encodeUrlPath(url){
        if (!url || typeof url !== "string") {
            return "";
        }
        if (url.indexOf("data:") === 0 || url.indexOf("blob:") === 0) {
            return url;
        }

        try {
            var parsed = new URL(url, window.location.href);
            var pathname = parsed.pathname || "";
            var encodedPath = pathname
                .split("/")
                .map(function(part){
                    if (!part) {
                        return "";
                    }
                    try {
                        return encodeURIComponent(decodeURIComponent(part));
                    } catch (e) {
                        return encodeURIComponent(part);
                    }
                })
                .join("/");
            parsed.pathname = encodedPath;
            return parsed.toString();
        } catch (e) {
            return url.replace(/ /g, "%20");
        }
    }

    $scope.getImageUrl = function(image){
        var candidates = buildImageCandidates(image);
        return candidates.length ? encodeUrlPath(candidates[0]) : "";
    };

    $scope.getImageFallbackUrl = function(image){
        var candidates = buildImageCandidates(image);
        return candidates.length > 1 ? encodeUrlPath(candidates[1]) : "";
    };

    $scope.getEmployeeImage = function(employee){
        var source = employee || {};
        var imageObj = source.image && typeof source.image === "object" ? source.image : null;
        var direct = (
            (imageObj && (imageObj.url || imageObj.path || imageObj.src || imageObj.location)) ||
            (typeof source.image === "string" ? source.image : "") ||
            source.image_url ||
            source.imagePath ||
            source.image_path ||
            source.profile_image ||
            source.profileImage ||
            source.photo ||
            source.avatar ||
            source.picture ||
            source.image_name ||
            source.imageName ||
            source.thumbnail ||
            source.thumb ||
            source.img ||
            ""
        );

        if (direct) {
            return direct;
        }

        // Fallback: detect common image-like keys from API payloads.
        var keys = Object.keys(source || {});
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var lowerKey = String(key).toLowerCase();
            var value = source[key];

            if (!value) {
                continue;
            }

            var looksLikeImageKey =
                lowerKey.indexOf("image") !== -1 ||
                lowerKey.indexOf("photo") !== -1 ||
                lowerKey.indexOf("avatar") !== -1 ||
                lowerKey.indexOf("picture") !== -1 ||
                lowerKey.indexOf("thumb") !== -1;

            if (!looksLikeImageKey) {
                continue;
            }

            if (typeof value === "string") {
                return value;
            }

            if (typeof value === "object") {
                var nested =
                    value.url ||
                    value.path ||
                    value.src ||
                    value.location ||
                    value.full ||
                    value.original ||
                    value.thumbnail ||
                    value.thumb ||
                    "";
                if (nested) {
                    return nested;
                }
            }
        }

        return "";
    };

    $scope.goToPage = function(page){
        if (page < 1 || page > $scope.pagination.totalPages) {
            return;
        }
        $scope.pagination.currentPage = page;
        $scope.currentPage = page;
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
        $scope.currentPage = 1;
        refreshPagination();
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
        $scope.pagination.currentPage = 1;
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
