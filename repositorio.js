module.exports = {
    conexion : async () => {
        var mongo = require("mongodb");
        var db = "mongodb://admin:informatica1234@cluster0-shard-00-00-6ogot.mongodb.net:27017,cluster0-shard-00-01-6ogot.mongodb.net:27017,cluster0-shard-00-02-6ogot.mongodb.net:27017/test?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin&retryWrites=true&w=majority";
        promise = new Promise((resolve, reject) => {
            mongo.MongoClient.connect(db, (err, db) => {
                if (err) {
                    resolve(null)
                } else {
                    resolve(db);
                }
            });
        });
        return promise;
    },
    insertarAnuncio : async (db, anuncio) => {

        promise = new Promise((resolve, reject) => {
            var collection = db.collection('anuncios');
            collection.insert(anuncio, (err, result) => {
                if (err) {
                    resolve(null);
                } else {
                    // _id no es un string es un ObjectID
                    resolve(result.ops[0]._id.toString());
                }
                db.close();
            });
        });

        return promise;
    }
}
