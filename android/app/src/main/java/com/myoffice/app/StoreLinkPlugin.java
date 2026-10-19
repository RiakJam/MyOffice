package com.myoffice.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "StoreLink")
public class StoreLinkPlugin extends Plugin {
    @PluginMethod
    public void open(PluginCall call) {
        String packageId = getContext().getPackageName();
        try {
            Intent store = new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + packageId));
            store.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(store);
            call.resolve();
        } catch (ActivityNotFoundException noStore) {
            try {
                Intent browser = new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=" + packageId));
                browser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(browser);
                call.resolve();
            } catch (ActivityNotFoundException noBrowser) {
                call.reject("No app can open the Play Store link", noBrowser);
            }
        }
    }
}
