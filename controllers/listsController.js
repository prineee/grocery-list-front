const sqlDB = require("../sql_connection");
const listTable = "uzzdv3povs4xqnxc.lists";
const listItemsTable = "uzzdv3povs4xqnxc.list_items";

module.exports = {
    addItem: function (req, res) {
        // prevent injections
        const name = sqlDB.escape(req.body.name);
        const user_id = sqlDB.escape(req.body.user_id);
        const store_id = sqlDB.escape(req.body.store_id);
        const position = sqlDB.escape(req.body.position);
        const priority = sqlDB.escape(req.body.priority);

        // find current list
        let getCurrentList = function () {
            sqlDB
                .query(`SELECT * FROM ${listTable} WHERE user_id = ${user_id} AND lists.completed = false;`,
                    function (err, results) {
                        if (err) {
                            return res.status(422).send(err);
                        } else {
                            if (results.length < 1) {
                                // if no lists, create a new list
                                createList();
                            }
                            // if completed, create a new list
                            if (results.completed > 0) {
                                createList();
                            } else {
                                addItemToList(results[0].id);
                            }
                        }
                    });
        }
        getCurrentList();

        // create list
        let createList = function () {
            const columns = "(date_added, user_id)"
            sqlDB
                .query(`INSERT INTO ${listTable} ${columns} VALUES (NOW(), ${user_id});`,
                    function (err) {
                        if (err) {
                            return res.status(422).send(err);
                        } else {
                            getCurrentList();
                        }
                    });
            // console.log("create list");
        }
        // add item to list
        let addItemToList = function (id) {
            const columns = "(date_added, list_id, name, store_id, position, priority)";
            sqlDB
                .query(`INSERT INTO ${listItemsTable} ${columns} VALUES (NOW(), ${id}, ${name}, ${store_id}, ${position}, ${priority});`,
                    function (err, results) {
                        if (err) {
                            return res.status(422).send(err);
                        } else {
                            return res.status(200).json(results);
                        }
                    });
        }
    },
    getCurrentUserList: function (req, res) {
        // prevent injections
        const ID = sqlDB.escape(req.params.id);
        // get current list
        sqlDB
            .query(`SELECT * FROM ${listTable} WHERE user_id = ${ID};`,
                function (err, results) {
                    if (err) {
                        return res.status(422).send(err);
                    } else {
                        getFullList();
                    }
                });
        let getFullList = function () {
            sqlDB
                .query(`CALL current_list(${ID});`,
                    function (err, results) {
                        if (err) {
                            return res.status(422).send(err);
                        } else {
                            return res.status(200).json(results[0]);
                        }
                    })
        }
    },
    updateItem: function (req, res) {
        // prevent injections
        const ID = sqlDB.escape(req.params.id);
        const update = req.body;
        // would be updating position on list, if it has been purchased or it's priority level
        const column = Object.keys(update)[0];
        const value = sqlDB.escape(update[column]);
        sqlDB
            .query(`UPDATE ${listItemsTable} SET ${column} = ${value} WHERE id = ${ID};`,
                function (err, results) {
                    if (err) {
                        return res.status(422).send(err);
                    } else {
                        return res.status(200).json(results);
                    }
                });
    },
    removeItem: function (req, res) {
        // prevent injections
        const ID = sqlDB.escape(req.params.id);
        sqlDB
            .query(`DELETE FROM ${listItemsTable} WHERE id = ${ID};`,
                function (err, results) {
                    if (err) {
                        return res.status(422).send(err);
                    } else {
                        return res.status(200).json(results);
                    }
                });
    },
    getListByID: function (req, res) {
        // prevent injections
        const ID = sqlDB.escape(req.body.user_id);
        const list_id = sqlDB.escape(req.body.id);
        
        sqlDB
            .query(`CALL get_list_by_id(${ID}, ${list_id});`,
                function (err, results) {
                    if (err) {
                        return res.status(422).send(err);
                    } else {
                        return res.status(200).json(results[0]);
                    }
                });
    },
    getListsByUserID: function (req, res) {
        // prevent injections
        const ID = sqlDB.escape(req.body.user_id);
        // default completed to true because this route will mostly be used for retrieving a completed list
        const completed = sqlDB.escape(req.body.completed || true);
        sqlDB
            .query(`SELECT * FROM lists WHERE user_id = ${ID} and completed = ${completed};`,
                function (err, results) {
                    if (err) {
                        return res.status(422).send(err);
                    } else {
                        return res.status(200).json(results);
                    }
                });
    }
}
