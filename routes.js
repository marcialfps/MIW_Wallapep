module.exports = {
    name: 'MiRouter',
    utilSubirFichero : async (binario, nombre, extension) => {
        return new Promise((resolve, reject) => {
            nombre = nombre + "." + extension;
            require('fs').writeFile('./public/subidas/'+nombre, binario, err => {
                if (err) {
                    resolve(false)
                }
                resolve(true)
            })
        })
    },
    register: async (server, options) => {
        repositorio = server.methods.getRepositorio();

        server.route([
            {
                method: 'POST',
                path: '/api/publicar',
                handler: async (req, h) => {
                    anuncio = {
                        usuario : "api" ,
                        titulo: req.payload.titulo,
                        descripcion: req.payload.descripcion,
                        categoria: req.payload.categoria,
                        precio: Number.parseFloat(req.payload.precio),

                    }

                    // await no continuar hasta acabar esto
                    // Da valor a respuesta
                    await repositorio.conexion()
                        .then((db) => repositorio.insertarAnuncio(db, anuncio))
                        .then((id) => {
                            respuesta = "";
                            if (id == null) {
                                respuesta =  "Error al insertar"
                            } else {
                                respuesta = "Insertado id:  "+ id;
                                idAnuncio = id;
                            }
                        })

                    binario = req.payload.foto._data;
                    extension = req.payload.foto.hapi.filename.split('.')[1];

                    await module.exports.utilSubirFichero(
                        binario, idAnuncio, extension);

                    return respuesta;
                }
            },
            {
                method: 'GET',
                path: '/api/anuncio/{id}',
                handler: async (req, h) => {
                    var criterio = { "_id" : require("mongodb").ObjectID(req.params.id) };
                    var anunciosObtenidos;
                    await repositorio.conexion()
                        .then((db) => repositorio.obtenerAnuncios(db, criterio))
                        .then((anuncios) => {
                            anunciosObtenidos = anuncios;
                        });

                    return anunciosObtenidos;
                }
            },
            {
                method: 'GET',
                path: '/api/anuncios',
                handler: async (req, h) => {
                    var anunciosObtenidos;
                    await repositorio.conexion()
                        .then((db) => repositorio.obtenerAnuncios(db, {}))
                        .then((anuncios) => {
                            anunciosObtenidos = anuncios;
                        })

                    return anunciosObtenidos;
                }
            },
            {
                method: 'GET',
                path: '/anuncio/{id}/eliminar',
                handler: async (req, h) => {

                    var criterio = { "_id" :
                            require("mongodb").ObjectID(req.params.id) };

                    await repositorio.conexion()
                        .then((db) => repositorio.eliminarAnuncios(db, criterio))
                        .then((resultado) => {
                            console.log("Eliminado")
                        })

                    return h.redirect('/misanuncios?mensaje="Anuncio Eliminado"')
                }
            },
            {
                method: 'POST',
                path: '/anuncio/{id}/modificar',
                options : {
                    auth: 'auth-registrado',
                    payload: {
                        output: 'stream'
                    }
                },
                handler: async (req, h) => {

                    // criterio de anucio a modificar
                    var criterio = { "_id" : require("mongodb").ObjectID(req.params.id) };

                    // nuevos valores para los atributos
                    anuncio = {
                        usuario: req.auth.credentials ,
                        titulo: req.payload.titulo,
                        descripcion: req.payload.descripcion,
                        categoria: req.payload.categoria,
                        precio: Number.parseFloat(req.payload.precio),
                    }

                    // await no continuar hasta acabar esto
                    // Da valor a respuesta
                    await repositorio.conexion()
                        .then((db) => repositorio.modificarAnuncio(db,criterio,anuncio))
                        .then((id) => {
                            respuesta = "";
                            if (id == null) {
                                respuesta =  "Error al modificar"
                            } else {
                                respuesta = "Modificado ";
                            }
                        })

                    // ¿nos han enviado foto nueva?
                    if ( req.payload.foto.filename != "") {
                        binario = req.payload.foto._data;
                        extension = req.payload.foto.hapi.filename.split('.')[1];

                        await module.exports.utilSubirFichero(
                            binario, req.params.id, extension);
                    }

                    return respuesta;
                }
            },
            {
                method: 'GET',
                path: '/anuncio/{id}/modificar',
                options: {
                    auth: 'auth-registrado'
                },
                handler: async (req, h) => {

                    var criterio = { "_id" : require("mongodb").ObjectID(req.params.id),
                                    "usuario": req.auth.credentials
                    };

                    await repositorio.conexion()
                        .then((db) => repositorio.obtenerAnuncios(db, criterio))
                        .then((anuncios) => {
                            // ¿Solo una coincidencia por _id?
                            anuncio = anuncios[0];
                        })

                    return h.view('modificar',
                        { anuncio: anuncio},
                        { layout: 'base'} );
                }
            },
            {
                method: 'GET',
                path: '/misanuncios',
                options: {
                    auth: 'auth-registrado'
                },
                handler: async (req, h) => {
                    var pg = parseInt(req.query.pg); // Es String !!!
                    if ( req.query.pg == null){ // Puede no venir el param
                        pg = 1;
                    }

                    var criterio = { "usuario" : req.auth.credentials };
                    // cookieAuth

                    await repositorio.conexion()
                        .then((db) => repositorio.obtenerAnunciosPg(db, pg, criterio))
                        .then((anuncios, total) => {
                            anunciosEjemplo = anuncios;

                            pgUltima = anunciosEjemplo.total/2;
                            // La págian 2.5 no existe
                            // Si excede sumar 1 y quitar los decimales
                            if (pgUltima % 2 > 0 ){
                                pgUltima = Math.trunc(pgUltima);
                                pgUltima = pgUltima+1;
                            }
                        })

                    var paginas = [];
                    for( i=1; i <= pgUltima; i++){
                        if ( i == pg ){
                            paginas.push({valor: i , clase : "uk-active" });
                        } else {
                            paginas.push({valor: i});
                        }
                    }

                    return h.view('misanuncios',
                        {
                            anuncios: anunciosEjemplo,
                            usuarioAutenticado: req.auth.credentials,
                            paginas : paginas
                        },
                        { layout: 'base'} );
                }
            },
            {

                method: 'GET',
                path: '/desconectarse',
                handler: async (req, h) => {
                    req.cookieAuth.set({ usuario: "", secreto: "" });
                    return h.view('login',
                        { },
                        { layout: 'base'});
                }
            },
            {
                method: 'POST',
                path: '/login',
                handler: async (req, h) => {
                    password = require('crypto').createHmac('sha256', 'secreto')
                        .update(req.payload.password).digest('hex');

                    usuarioBuscar = {
                        usuario: req.payload.usuario,
                        password: password,
                    }

                    // await no continuar hasta acabar esto
                    // Da valor a respuesta
                    await repositorio.conexion()
                        .then((db) => repositorio.obtenerUsuarios(db, usuarioBuscar))
                        .then((usuarios) => {
                            respuesta = "";
                            if (usuarios == null || usuarios.length == 0 ) {
                                respuesta =  "No identificado"
                            } else {
                                req.cookieAuth.set({
                                    usuario: usuarios[0].usuario,
                                    secreto : "secreto"
                                });
                                respuesta = "Identificado correctamente";
                            }
                        })

                    return respuesta;
                }
            },
            {
                method: 'GET',
                path: '/login',
                handler: async (req, h) => {
                    return h.view('login',
                        { },
                        { layout: 'base'});
                }
            },
            {
                method: 'POST',
                path: '/registro',
                handler: async (req, h) => {
                    password = require('crypto').createHmac('sha256', 'secreto')
                        .update(req.payload.password).digest('hex');

                    usuario = {
                        usuario: req.payload.usuario,
                        password: password,
                    }

                    // await no continuar hasta acabar esto
                    // Da valor a respuesta
                    await repositorio.conexion()
                        .then((db) => repositorio.insertarUsuario(db, usuario))
                        .then((id) => {
                            respuesta = "";
                            if (id == null) {
                                respuesta =  "Error al insertar"
                            } else {
                                respuesta = "Insertado id:  "+ id;

                            }
                        })

                    return respuesta;
                }
            },
            {
                method: 'GET',
                path: '/registro',
                handler: async (req, h) => {
                    return h.view('registro',
                        { },
                        { layout: 'base'});
                }
            },
            {
                method: 'POST',
                path: '/publicar',
                options : {
                    auth: 'auth-registrado',
                    payload: {
                        output: 'stream'
                    }
                },
                handler: async (req, h) => {

                    anuncio = {
                        usuario : req.auth.credentials ,
                        titulo: req.payload.titulo,
                        descripcion: req.payload.descripcion,
                        categoria: req.payload.categoria,
                        precio: Number.parseFloat(req.payload.precio),

                    }

                    // await no continuar hasta acabar esto
                    // Da valor a respuesta
                    await repositorio.conexion()
                        .then((db) => repositorio.insertarAnuncio(db, anuncio))
                        .then((id) => {
                            respuesta = "";
                            if (id == null) {
                                respuesta =  "Error al insertar"
                            } else {
                                respuesta = "Insertado id:  "+ id;
                                idAnuncio = id;
                            }
                        })

                    binario = req.payload.foto._data;
                    extension = req.payload.foto.hapi.filename.split('.')[1];

                    await module.exports.utilSubirFichero(
                        binario, idAnuncio, extension);

                    return respuesta;
                }
            },
            {
                method: 'GET',
                path: '/publicar',
                options: {
                    auth: 'auth-registrado'
                },
                handler: async (req, h) => {
                    return h.view('publicar',
                        { usuario: 'jordán'},
                        { layout: 'base'});
                }
            },
            {
                method: 'GET',
                path: '/anuncios',
                handler: async (req, h) => {

                    var criterio = {};
                    if (req.query.criterio != null ){
                        criterio = { "titulo" : {$regex : ".*"+req.query.criterio+".*"} };
                    }
                    await repositorio.conexion()
                        .then((db) => repositorio.obtenerAnuncios(db, criterio))
                        .then((anuncios) => {
                            anunciosEjemplo = anuncios;
                        })

                    // Recorte
                    anunciosEjemplo.forEach( (e) => {
                        if (e.titulo.length > 25){
                            e.titulo = e.titulo.substring(0, 25) + "...";
                        }
                        if (e.descripcion.length > 80) {
                            e.descripcion = e.descripcion.substring(0, 80) + "...";;
                        }
                    });

                    return h.view('anuncios',
                        {
                            usuario: 'jordán',
                            anuncios: anunciosEjemplo
                        }, { layout: 'base'} );
                }
            },
            {
                method: 'GET',
                path: '/{param*}',
                handler: {
                    directory: {
                        path: './public'
                    }
                }
            },
            {
                method: 'GET',
                path: '/anuncio/{id}',
                handler: async (req, h) => {
                    return 'Anuncio id: ' + req.params.id;
                }
            },
            {
                method: 'GET',
                path: '/',
                handler: async (req, h) => {
                    return h.view('index',
                        { usuario: 'jordán'},
                        { layout: 'base'});
                }
            }
        ])
    }
}
