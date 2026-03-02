app.service("EmployeeService", function($http){

    var API = "/api/employees";
    var FORM_HEADERS = {
        transformRequest: angular.identity,
        headers: { "Content-Type": undefined }
    };

    function buildEmployeeFormData(emp, isUpdate){
        var formData = new FormData();

        formData.append("fullname", emp.fullname || "");
        formData.append("age", emp.age || "");
        formData.append("address", emp.address || "");
        formData.append("birth", emp.birth || "");
        formData.append("email", emp.email || "");
        formData.append("department", emp.department || "");
        formData.append("description", emp.description || "");
        formData.append("position", emp.position || "");

        if (emp.department_id !== undefined && emp.department_id !== null && emp.department_id !== "") {
            formData.append("department_id", emp.department_id);
        }
        if (emp.position_id !== undefined && emp.position_id !== null && emp.position_id !== "") {
            formData.append("position_id", emp.position_id);
        }
        if (emp.department_name) {
            formData.append("department_name", emp.department_name);
        }
        if (emp.position_name) {
            formData.append("position_name", emp.position_name);
        }

        if (emp.imageFile) {
            formData.append("image", emp.imageFile);
        }

        if (isUpdate) {
            formData.append("_method", "PUT");
        }

        return formData;
    }

    this.getAll = function(){
        return $http.get(API);
    };

    this.create = function(emp){
        return $http.post(API, buildEmployeeFormData(emp, false), FORM_HEADERS);
    };

    this.update = function(id, emp){
        return $http.post(API + "/" + id, buildEmployeeFormData(emp, true), FORM_HEADERS);
    };

    this.delete = function(id){
        return $http.delete(API + "/" + id);
    };

});
