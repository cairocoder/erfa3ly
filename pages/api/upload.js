const b2cs = require("b2-cloud-storage");
import formidable from "formidable";
import { extname } from "path";
// const zip = require("zip-lib");
import Ably from "ably";
import io from "socket.io-client";
import { Server } from "socket.io";

export const config = {
    api: {
        bodyParser: false,
    },
};

global.cancellationRequested = false;
global.fieldId = "";

var ably = new Ably.Realtime(
    "LObVIA.-Xrj3A:IGVxQ6RDqWeKj7bFnzILx1Mt3qTMKL-rh43QiJxWP8s"
);

var channel = ably.channels.get("test");

channel.publish("progress", "");

let b2 = new b2cs({
    auth: {
        accountId: "002469a21b779f20000000006", // NOTE: This is the accountId unique to the key
        applicationKey: "K002uoa1O51CtYSJuhkB55OYsoXaIhA",
    },
});

const post = async (req, res) => {
    const form = new formidable.IncomingForm({
        maxFileSize: 10_000_000_000,
    });
    // console.log(form);
    form.parse(req, async function (err, fields, files) {
        // console.log(files.file);
        const filename = Date.now() + extname(files.file.originalFilename);
        uploadFile(files.file, filename);
        return res.status(201).send({ url: filename });
    });
};

const uploadFile = (file, filename) => {
    var percent = -1;
    global.cancellationRequested = false;

    b2.authorize(function (err) {
        if (err) {
            throw err;
        }
        // this function wraps both a normal upload AND a large file upload
        b2.uploadFile(
            file?.filepath,
            {
                bucketId: "8486398a2261ab0777c90f12",
                fileName: filename, // this is the object storage "key". Can include a full path
                contentType: file.mimetype,
                // partSize: 5_000_000,
                // progressInterval: 5000,
                onFileId: function (id) {
                    // console.log(id);
                    global.fieldId = id;
                    channel.publish("fieldId", id);
                },
                onUploadProgress: function (update) {
                    // Check if cancellation was requested
                    if (cancellationRequested) {
                        // Clean up and stop the upload
                        // You might need to handle this differently based on the library you're using
                        // For example, Ably might have methods to unsubscribe from channels.
                        return;
                    }
                    // console.log(percent, update);
                    if (update.percent > percent || percent === -1) {
                        channel.publish("progress", update);
                    }

                    percent = update.percent;
                },
            },
            function (err, results) {
                // handle callback
            }
        );
    });
};

const cancel = async (req, res) => {
    global.cancellationRequested = true;

    //cancel large file
    b2.authorize(function (err) {
        if (err) {
            throw err;
        }
        b2.cancelLargeFile(
            {
                fileId: global.fieldId,
            },
            function (data) {
                return res.status(200).send({ data: 1 });
            }
        );
    });

    // Send a response indicating that the cancel request was received
    return res.status(200).send("Upload cancellation requested.");
};

const methods = (req, res) => {
    req.method === "POST"
        ? post(req, res)
        : req.method === "PUT"
        ? put(req, res)
        : req.method === "DELETE"
        ? cancel(req, res) // Handle the CANCEL method
        : req.method === "GET"
        ? console.log("GET")
        : res.status(404).send("");
};

export default methods;
