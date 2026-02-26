app.factory("PayrollService", function($http){

    var api = "http://127.0.0.1:8000/api/payrolls";

    return {

        getAll: function(){
            return $http.get(api);
        },

        generate: function(data){
            return $http.post(api, data);
        },

        update: function(id, data){
            return $http.put(api + "/" + id, data);
        },

        remove: function(id){
            return $http.delete(api + "/" + id);
        }

    };

});
