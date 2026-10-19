package com.myoffice.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.InputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "SaveDocument")
public class SaveDocumentPlugin extends Plugin {
    @PluginMethod
    public void save(PluginCall call) {
        String sourceUri = call.getString("sourceUri");
        String filename = call.getString("filename");
        String mimeType = call.getString("mimeType");
        if (sourceUri == null || filename == null || mimeType == null) {
            call.reject("Missing file details");
            return;
        }

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, filename);
        startActivityForResult(call, intent, "onSaveResult");
    }

    @ActivityCallback
    private void onSaveResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            JSObject response = new JSObject();
            response.put("saved", false);
            call.resolve(response);
            return;
        }

        Uri destination = result.getData().getData();
        Uri source = Uri.parse(call.getString("sourceUri"));
        try (InputStream input = getContext().getContentResolver().openInputStream(source);
             OutputStream output = getContext().getContentResolver().openOutputStream(destination)) {
            if (input == null || output == null) throw new IllegalStateException("Could not open the selected file");
            byte[] buffer = new byte[65536];
            int count;
            while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
            output.flush();
            JSObject response = new JSObject();
            response.put("saved", true);
            call.resolve(response);
        } catch (Exception error) {
            call.reject("Could not save document: " + error.getMessage(), error);
        }
    }
}
