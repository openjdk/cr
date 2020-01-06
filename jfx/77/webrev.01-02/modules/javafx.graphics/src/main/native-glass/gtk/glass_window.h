/*
 * Copyright (c) 2011, 2020, Oracle and/or its affiliates. All rights reserved.
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  Oracle designates this
 * particular file as subject to the "Classpath" exception as provided
 * by Oracle in the LICENSE file that accompanied this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the LICENSE file that
 * accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * Please contact Oracle, 500 Oracle Parkway, Redwood Shores, CA 94065 USA
 * or visit www.oracle.com if you need additional information or have any
 * questions.
 */
#ifndef GLASS_WINDOW_H
#define        GLASS_WINDOW_H

#include <gtk/gtk.h>
#include <X11/Xlib.h>

#include <jni.h>
#include <set>
#include <vector>

#include "glass_view.h"
#include "glass_general.h"

enum WindowFrameType {
    TITLED,
    UNTITLED,
    TRANSPARENT
};

enum WindowType {
    NORMAL,
    UTILITY,
    POPUP
};

enum request_type {
    REQUEST_NONE,
    REQUEST_RESIZABLE,
    REQUEST_NOT_RESIZABLE
};

static const guint MOUSE_BUTTONS_MASK = (guint) (GDK_BUTTON1_MASK | GDK_BUTTON2_MASK | GDK_BUTTON3_MASK);

struct BgColor {
    BgColor(): red(0), green(0), blue(0), is_set(FALSE) {}
    float red;
    float green;
    float blue;
    bool is_set;
};


struct WindowGeometry {
    WindowGeometry(): current_x(0),
                      current_y(0),
                      current_w(0),
                      current_h(0),
                      current_cw(0),
                      current_ch(0),
                      adjust_w(0),
                      adjust_h(0),
                      view_x(0),
                      view_y(0),
                      frame_extents_received(false),
                      gravity_x(1.00),
                      gravity_y(1.00),
                      enabled_on_map(true),
                      enabled(true),
                      resizable(true),
                      resizable_on_map(true),
                      minw(-1),
                      minh(-1),
                      maxw(-1),
                      maxh(-1){}

    int current_x; // current position X
    int current_y; // current position Y
    int current_w; // current window width
    int current_h; // current window height
    int current_cw; // current content (view) width
    int current_ch; // current content (view) height

    // Used to ajust window sizes because gtk doest not account frame extents as part
    // of the window size and JavaFx does.
    int adjust_w;
    int adjust_h;

    // The position of the view relative to the window
    int view_x;
    int view_y;

    // If WM supports _NET_REQUEST_FRAME_EXTENTS and it was received
    bool frame_extents_received;

    // Currently not used
    float gravity_x;
    float gravity_y;

    bool enabled_on_map;
    bool enabled;
    bool resizable;
    bool resizable_on_map; // resizable property will be final when window is mapped

    int minw;
    int minh;

    int maxw;
    int maxh;
};

class WindowContextTop;

class WindowContext {
public:
    virtual bool isEnabled() = 0;
    virtual bool hasIME() = 0;
    virtual bool filterIME(GdkEvent *) = 0;
    virtual void enableOrResetIME() = 0;
    virtual void disableIME() = 0;
    virtual void paint(void* data, jint width, jint height) = 0;
    virtual WindowGeometry get_geometry() = 0;

    virtual void enter_fullscreen() = 0;
    virtual void exit_fullscreen() = 0;
    virtual void show_or_hide_children(bool) = 0;
    virtual void set_visible(bool) = 0;
    virtual bool is_visible() = 0;
    virtual void set_bounds(int, int, bool, bool, int, int, int, int) = 0;
    virtual void set_resizable(bool) = 0;
    virtual void request_focus() = 0;
    virtual void set_focusable(bool)= 0;
    virtual bool grab_focus() = 0;
    virtual void ungrab_focus() = 0;
    virtual void set_title(const char*) = 0;
    virtual void set_alpha(double) = 0;
    virtual void set_enabled(bool) = 0;
    virtual void set_minimum_size(int, int) = 0;
    virtual void set_maximum_size(int, int) = 0;
    virtual void set_minimized(bool) = 0;
    virtual void set_maximized(bool) = 0;
    virtual void set_icon(GdkPixbuf*) = 0;
    virtual void restack(bool) = 0;
    virtual void set_cursor(GdkCursor*) = 0;
    virtual void set_modal(bool, WindowContext* parent = NULL) = 0;
    virtual void set_gravity(float, float) = 0;
    virtual void set_level(int) = 0;
    virtual void set_background(float, float, float) = 0;

    virtual void process_property_notify(GdkEventProperty*) = 0;
    virtual void process_configure(GdkEventConfigure*) = 0;
    virtual void process_map() = 0;
    virtual void process_focus(GdkEventFocus*) = 0;
    virtual void process_destroy() = 0;
    virtual void process_delete() = 0;
#ifdef GLASS_GTK3
    virtual void process_draw(cairo_t*) = 0;
#else
    virtual void process_expose(GdkEventExpose*) = 0;
#endif
    virtual void process_mouse_button(GdkEventButton*) = 0;
    virtual void process_mouse_motion(GdkEventMotion*) = 0;
    virtual void process_mouse_scroll(GdkEventScroll*) = 0;
    virtual void process_mouse_cross(GdkEventCrossing*) = 0;
    virtual void process_key(GdkEventKey*) = 0;
    virtual void process_state(GdkEventWindowState*) = 0;
    virtual void process_screen_changed() { }
    virtual void notify_state(jint) = 0;
    virtual void notify_on_top(bool) {}

    virtual void add_child(WindowContextTop* child) = 0;
    virtual void remove_child(WindowContextTop* child) = 0;
    virtual bool set_view(jobject) = 0;

    virtual GdkWindow *get_gdk_window() = 0;
    virtual GtkWindow *get_gtk_window() = 0;
    virtual GtkWidget *get_gtk_widget() = 0;
    virtual jobject get_jview() = 0;
    virtual jobject get_jwindow() = 0;

    virtual int getEmbeddedX() = 0;
    virtual int getEmbeddedY() = 0;

    virtual void increment_events_counter() = 0;
    virtual void decrement_events_counter() = 0;
    virtual size_t get_events_count() = 0;
    virtual bool is_dead() = 0;

    virtual ~WindowContext() {}
};

class WindowContextBase: public WindowContext {

    struct _XIM{
        XIM im;
        XIC ic;
        bool enabled;
    } xim;

    size_t events_processing_cnt;
    bool can_be_deleted;
protected:
    std::set<WindowContextTop*> children;
    jobject jwindow;
    jobject jview;
    GtkWidget* gtk_widget;
    GdkWindow* gdk_window;
    GtkWindowGroup* win_group; // this is used for window grabs
    GdkWMFunction gdk_windowManagerFunctions;
    BgColor bg_color;

    bool is_iconified;
    bool is_maximized;
    bool is_mouse_entered;

public:
    bool isEnabled();
    bool hasIME();
    bool filterIME(GdkEvent *);
    void enableOrResetIME();
    void disableIME();
    void paint(void*, jint, jint);
    GdkWindow *get_gdk_window();
    GtkWidget *get_gtk_widget();
    jobject get_jwindow();
    jobject get_jview();

    void add_child(WindowContextTop*);
    void remove_child(WindowContextTop*);
    void show_or_hide_children(bool);
    void set_visible(bool);
    bool is_visible();
    bool set_view(jobject);
    bool grab_focus();
    void ungrab_focus();
    void set_cursor(GdkCursor*);
    void set_level(int) {}
    void set_background(float, float, float);

    void process_map() {}
    void process_focus(GdkEventFocus*);
    void process_destroy();
    void process_delete();
#ifdef GLASS_GTK3
    void process_draw(cairo_t*);
#else
    void process_expose(GdkEventExpose*);
#endif
    void process_mouse_button(GdkEventButton*);
    void process_mouse_motion(GdkEventMotion*);
    void process_mouse_scroll(GdkEventScroll*);
    void process_mouse_cross(GdkEventCrossing*);
    void process_key(GdkEventKey*);
    void process_state(GdkEventWindowState*);

    void notify_repaint();
    void notify_state(jint);

    int getEmbeddedX() { return 0; }
    int getEmbeddedY() { return 0; }

    void increment_events_counter();
    void decrement_events_counter();
    size_t get_events_count();
    bool is_dead();

    ~WindowContextBase();
protected:
    virtual void applyShapeMask(void*, uint width, uint height) = 0;
private:
    bool im_filter_keypress(GdkEventKey*);
    void paint_buffer(cairo_t*);
};


class WindowContextTop: public WindowContextBase {
    jlong screen;
    WindowFrameType frame_type;
    WindowType window_type;
    struct WindowContext *owner;
    WindowGeometry geometry;
    bool map_received;
    bool on_top;
    bool is_fullscreen;

public:
    WindowContextTop(jobject, WindowContext*, long, WindowFrameType, WindowType, GdkWMFunction);
    void process_map();
    void process_property_notify(GdkEventProperty*);
    void process_configure(GdkEventConfigure*);
    void process_destroy();
    void process_net_wm_property();
    void process_screen_changed();

    WindowGeometry get_geometry();

    void set_minimized(bool);
    void set_maximized(bool);
    void set_bounds(int, int, bool, bool, int, int, int, int);
    void set_resizable(bool);
    void request_focus();
    void set_focusable(bool);
    void set_title(const char*);
    void set_alpha(double);
    void set_enabled(bool);
    void set_minimum_size(int, int);
    void set_maximum_size(int, int);
    void set_icon(GdkPixbuf*);
    void restack(bool);
    void set_modal(bool, WindowContext* parent = NULL);
    void set_gravity(float, float);
    void set_level(int);
    void set_visible(bool);
    void notify_on_top(bool);

    void enter_fullscreen();
    void exit_fullscreen();

    void set_owner(WindowContext*);

    GtkWindow *get_gtk_window();
    void detach_from_java();
protected:
    void applyShapeMask(void*, uint width, uint height);
private:
    void calculate_adjustments();
    void apply_geometry();
    bool get_frame_extents_property(int *, int *, int *, int *);
    void request_frame_extents();
    void activate_window();
    void size_position_notify();
    void update_ontop_tree(bool);
    bool on_top_inherited();
    bool effective_on_top();
    WindowContextTop(WindowContextTop&);
    WindowContextTop& operator= (const WindowContextTop&);
};

void destroy_and_delete_ctx(WindowContext* ctx);

class EventsCounterHelper {
private:
    WindowContext* ctx;
public:
    explicit EventsCounterHelper(WindowContext* context) {
        ctx = context;
        ctx->increment_events_counter();
    }
    ~EventsCounterHelper() {
        ctx->decrement_events_counter();
        if (ctx->is_dead() && ctx->get_events_count() == 0) {
            delete ctx;
        }
        ctx = NULL;
    }
};

#endif        /* GLASS_WINDOW_H */

