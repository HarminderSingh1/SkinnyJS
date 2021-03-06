﻿/* globals History */

$.modalDialog.iframeLoadTimeout = 1000;
$.modalDialog.animationDuration = 100;

describe("jquery.modalDialog.history", function()
{
    var assert = chai.assert;
    
    var DIALOG_PARAM_NAME = "testdialogparam";

    $.modalDialog.enableHistory(DIALOG_PARAM_NAME);

    var delayedResolver = function(deferred)
    {
        return function() { setTimeout(function() { deferred.resolve(); }, 0); };
    };

    var wait = function()
    {
        // Calling dialog.close() invokes history.back(), which is asynchronous (in most browsers).
        // We need a timeout to wait until the URL is really updated.

        // TODO it would be great to have a way to tell when the URL was really updated:
        // wrap up an API that would return a promise from history.back()

        return $.timeout(100);
    };

    var assertDialogParams = function(expectedLength)
    {
        var qs = currentQueryStringOrHash();

        if (expectedLength === 0)
        {
            assert.isUndefined(qs[DIALOG_PARAM_NAME], "There should be no dialog parameters in the URL");
        }
        else
        {
            assert.isString(qs[DIALOG_PARAM_NAME], "There should be dialog parameters in the URL");
            assert.equal(qs[DIALOG_PARAM_NAME].split(" ").length, expectedLength, "There should be " + expectedLength + " dialog parameters entry in the URL");
        }
    };

    var currentQueryStringOrHash = function()
    {
        if (window.location.search)
        {
            return $.currentQueryString();
        }
        else if (History.emulated.pushState && window.location.hash)
        {
            var qPos = window.location.hash.indexOf("?");
            if (qPos >= 0)
            {
                return $.deparam(window.location.hash.substr(qPos));
            }
        }

        return {};
    };

    function testDialogHistoryManagement(dialogType, dialogOptions)
    {
        it("modifies the URL and history when opening and closing a " + dialogType + " dialog", function(done)
        {
            var dialog = $.modalDialog.create(dialogOptions);

            dialog
                .open()
                .then(wait)
                .then(function()
                {
                    assertDialogParams(1);
                    assert.isTrue(dialog.isOpen(), "Ensure dialog is open");
                    
                    var deferred = $.Deferred();

                    dialog.onclose.one(delayedResolver(deferred));

                    window.history.back();

                    return deferred;
                })
                .then(wait)
                .then(function()
                {
                    // We navigated back. There should not be any dialog parameters in the URL.
                    assertDialogParams(0);
                    assert.isFalse(dialog.isOpen(), "Ensure dialog is closed");

                    var deferred = $.Deferred();

                    dialog.onopen.one(delayedResolver(deferred));

                    window.history.forward();

                    return deferred;
                })
                .then(function()
                {
                    // We navigated forward. The dialog parameters should be back in the URL.
                    assertDialogParams(1);
                    assert.isTrue(dialog.isOpen(), "Ensure dialog is open");

                    return dialog.close();
                })
                .then(wait)
                .then(function()
                {
                    // We manually closed the dialog. The parameters should no longer be in the URL.
                    assertDialogParams(0);
                    assert.isFalse(dialog.isOpen(), "Ensure dialog is closed");

                    return $.timeout(100);
                })
                .then(function()
                {
                    done();
                });
        });

        it("doesn't modify the URL when opening and closing a " + dialogType + " dialog with settings.enableHistory === false", function(done)
        {
            var options = $.extend({ enableHistory: false }, dialogOptions);

            var dialog = $.modalDialog.create(options);

            dialog
                .open()
                .then(function()
                {
                    assert.isTrue(dialog.isOpen(), "Ensure dialog is closed");

                    var qs = currentQueryStringOrHash();
                    assert.isUndefined(qs[DIALOG_PARAM_NAME], "The dialog is open: there should be dialog parameters in the URL");

                    return dialog.close();
                })
                .then(wait)
                .then(function()
                {
                    assert.isFalse(dialog.isOpen(), "Ensure dialog is closed");

                    var qs = currentQueryStringOrHash();
                    assert.isUndefined(qs[DIALOG_PARAM_NAME], "The dialog is closed: there should not be dialog parameters in the URL");

                    return $.timeout(100);
                })
                .then(function()
                {
                    done();
                });
        });
    }

    testDialogHistoryManagement("node", { content: "#simpleDialog" });

    testDialogHistoryManagement("iframe", { url: "content/jquery.modalDialog.iframeContent.html" });

    testDialogHistoryManagement("ajax", { url: "content/jquery.modalDialog.ajaxContent.html", ajax: true });

    it("modifies the URL and history when opening and closing a dialog 2nd level dialog", function(done)
    {
        /* jshint quotmark:false */

        $('<div class="dialog-content" id="firstDialog">content</div>').appendTo(document.body);
        var dialog1 = $.modalDialog.create({ content: "#firstDialog" });

        $('<div class="dialog-content" id="secondDialog">content</div>').appendTo(document.body);
        var dialog2;

        dialog1
            .open()
            .then(wait)
            .then(function()
            {
                assertDialogParams(1);

                dialog2 = $.modalDialog.create({ content: "#secondDialog" });
                return dialog2.open();
            })
            .then(wait)
            .then(function()
            {
                assertDialogParams(2);

                return dialog2.close();
            })
            .then(wait)
            .then(function()
            {
                assertDialogParams(1);

                return dialog1.close();
            })
            .then(wait)
            .then(function()
            {
                assertDialogParams(0);

                var deferred = $.Deferred();
                dialog1.onopen.one(delayedResolver(deferred));

                history.forward();

                return deferred.promise();
            })
            .then(wait)
            .then(function()
            {
                assertDialogParams(1);
                assert.ok(dialog1.isOpen());

                var deferred = $.Deferred();
                dialog2.onopen.one(delayedResolver(deferred));

                history.forward();

                return deferred.promise();
            })
            .then(wait)
            .then(function()
            {
                assertDialogParams(2);
                assert.ok(dialog2.isOpen());

                var deferred = $.Deferred();
                dialog2.onclose.one(delayedResolver(deferred));

                history.back();

                return deferred.promise();
            })
            .then(wait)
            .then(function()
            {
                assertDialogParams(1);
                assert.ok(dialog1.isOpen());
                assert.notOk(dialog2.isOpen());

                var deferred = $.Deferred();
                dialog1.onclose.one(delayedResolver(deferred));

                history.back();

                return deferred.promise();
            })
            .then(wait)
            .then(function()
            {
                assertDialogParams(0);
                assert.notOk(dialog1.isOpen());
                assert.notOk(dialog2.isOpen());

                done();
            });                    
    });
});
