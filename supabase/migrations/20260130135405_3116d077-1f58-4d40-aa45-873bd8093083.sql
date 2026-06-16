-- Create table for page views tracking
CREATE TABLE public.page_views (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    visitor_id TEXT NOT NULL,
    page_path TEXT NOT NULL,
    page_title TEXT,
    referrer TEXT,
    user_agent TEXT,
    duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for click/keyword tracking
CREATE TABLE public.click_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    visitor_id TEXT NOT NULL,
    page_path TEXT NOT NULL,
    element_type TEXT NOT NULL,
    element_text TEXT,
    element_id TEXT,
    element_class TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_page_views_created_at ON public.page_views(created_at DESC);
CREATE INDEX idx_page_views_page_path ON public.page_views(page_path);
CREATE INDEX idx_page_views_visitor_id ON public.page_views(visitor_id);
CREATE INDEX idx_click_events_created_at ON public.click_events(created_at DESC);
CREATE INDEX idx_click_events_element_text ON public.click_events(element_text);

-- Enable RLS
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.click_events ENABLE ROW LEVEL SECURITY;

-- Allow public inserts for tracking (anonymous visitors)
CREATE POLICY "Anyone can insert page views"
ON public.page_views
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Anyone can insert click events"
ON public.click_events
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow admins to view all analytics
CREATE POLICY "Admins can view page views"
ON public.page_views
FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admins can view click events"
ON public.click_events
FOR SELECT
USING (public.is_admin());

-- Allow admins to delete old analytics data
CREATE POLICY "Admins can delete page views"
ON public.page_views
FOR DELETE
USING (public.is_admin());

CREATE POLICY "Admins can delete click events"
ON public.click_events
FOR DELETE
USING (public.is_admin());