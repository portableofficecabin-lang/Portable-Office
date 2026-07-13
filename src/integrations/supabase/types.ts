export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          assigned_to: string | null
          company: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          id: string
          next_followup_at: string | null
          notes: string | null
          pipeline_stage: string
          service_type: string
          status: string
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          assigned_to?: string | null
          company?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          next_followup_at?: string | null
          notes?: string | null
          pipeline_stage?: string
          service_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          assigned_to?: string | null
          company?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          next_followup_at?: string | null
          notes?: string | null
          pipeline_stage?: string
          service_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string
          category: string
          content: string | null
          created_at: string
          created_by: string | null
          excerpt: string | null
          featured: boolean
          featured_image_url: string | null
          id: string
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          sort_order: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          category?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          featured?: boolean
          featured_image_url?: string | null
          id?: string
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          sort_order?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          category?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          featured?: boolean
          featured_image_url?: string | null
          id?: string
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          sort_order?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      booking_otps: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_hash: string
          verified: boolean | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp_hash: string
          verified?: boolean | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_hash?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      cabin_material_rates: {
        Row: {
          gst_percent: number
          id: string
          item_key: string
          name: string
          rate: number
          unit: string
          updated_at: string
          wastage_percent: number
        }
        Insert: {
          gst_percent?: number
          id?: string
          item_key: string
          name: string
          rate?: number
          unit: string
          updated_at?: string
          wastage_percent?: number
        }
        Update: {
          gst_percent?: number
          id?: string
          item_key?: string
          name?: string
          rate?: number
          unit?: string
          updated_at?: string
          wastage_percent?: number
        }
        Relationships: []
      }
      cabin_quotations: {
        Row: {
          bom: Json
          client_company: string | null
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          quotation_number: string
          site_address: string | null
          spec: Json
          status: string
          totals: Json
          updated_at: string
        }
        Insert: {
          bom?: Json
          client_company?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          quotation_number?: string
          site_address?: string | null
          spec?: Json
          status?: string
          totals?: Json
          updated_at?: string
        }
        Update: {
          bom?: Json
          client_company?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          quotation_number?: string
          site_address?: string | null
          spec?: Json
          status?: string
          totals?: Json
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          customization_notes: string | null
          id: string
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customization_notes?: string | null
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customization_notes?: string | null
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          google_product_category: string | null
          id: string
          image_url: string | null
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          google_product_category?: string | null
          id?: string
          image_url?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          google_product_category?: string | null
          id?: string
          image_url?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      click_events: {
        Row: {
          created_at: string
          element_class: string | null
          element_id: string | null
          element_text: string | null
          element_type: string
          id: string
          page_path: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          element_class?: string | null
          element_id?: string | null
          element_text?: string | null
          element_type: string
          id?: string
          page_path: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          element_class?: string | null
          element_id?: string | null
          element_text?: string | null
          element_type?: string
          id?: string
          page_path?: string
          visitor_id?: string
        }
        Relationships: []
      }
      contractors: {
        Row: {
          address: string | null
          company: string | null
          created_at: string
          email: string | null
          gstin: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customer_notes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_tags: {
        Row: {
          created_at: string
          id: string
          tag: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tag: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tag?: string
          user_id?: string
        }
        Relationships: []
      }
      drawing_sign_off: {
        Row: {
          checked_by: string
          designed_by: string
          engineer_licence: string
          engineer_name: string
          id: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          checked_by?: string
          designed_by?: string
          engineer_licence?: string
          engineer_name?: string
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          checked_by?: string
          designed_by?: string
          engineer_licence?: string
          engineer_name?: string
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      enquiries: {
        Row: {
          assigned_to: string | null
          company: string | null
          created_at: string
          email: string
          enquiry_type: string
          expected_value: number | null
          id: string
          lead_source: string
          lead_status: string
          lost_reason: string | null
          message: string
          name: string
          next_followup_at: string | null
          phone: string | null
          pipeline_stage: string
          product_id: string | null
          product_name: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company?: string | null
          created_at?: string
          email: string
          enquiry_type?: string
          expected_value?: number | null
          id?: string
          lead_source?: string
          lead_status?: string
          lost_reason?: string | null
          message: string
          name: string
          next_followup_at?: string | null
          phone?: string | null
          pipeline_stage?: string
          product_id?: string | null
          product_name?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company?: string | null
          created_at?: string
          email?: string
          enquiry_type?: string
          expected_value?: number | null
          id?: string
          lead_source?: string
          lead_status?: string
          lost_reason?: string | null
          message?: string
          name?: string
          next_followup_at?: string | null
          phone?: string | null
          pipeline_stage?: string
          product_id?: string | null
          product_name?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      factories: {
        Row: {
          address: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          location: string
          name: string
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          location: string
          name: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string
          name?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      factory_invoice_materials: {
        Row: {
          category: string
          created_at: string
          id: string
          invoice_id: string | null
          name: string
          notes: string | null
          ordered: number
          received: number
          unit: string
          updated_at: string
          used: number
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          name: string
          notes?: string | null
          ordered?: number
          received?: number
          unit: string
          updated_at?: string
          used?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          name?: string
          notes?: string | null
          ordered?: number
          received?: number
          unit?: string
          updated_at?: string
          used?: number
        }
        Relationships: [
          {
            foreignKeyName: "factory_invoice_materials_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "factory_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      factory_invoices: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          status: string
          supplier_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          status?: string
          supplier_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          status?: string
          supplier_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      factory_tracker_settings: {
        Row: {
          alert_threshold_percent: number
          id: string
          theft_detection_enabled: boolean
          updated_at: string
          warning_threshold_percent: number
        }
        Insert: {
          alert_threshold_percent?: number
          id?: string
          theft_detection_enabled?: boolean
          updated_at?: string
          warning_threshold_percent?: number
        }
        Update: {
          alert_threshold_percent?: number
          id?: string
          theft_detection_enabled?: boolean
          updated_at?: string
          warning_threshold_percent?: number
        }
        Relationships: []
      }
      follow_ups: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          created_by: string | null
          enquiry_id: string
          follow_up_type: string
          id: string
          notes: string | null
          scheduled_at: string | null
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          enquiry_id: string
          follow_up_type?: string
          id?: string
          notes?: string | null
          scheduled_at?: string | null
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          enquiry_id?: string
          follow_up_type?: string
          id?: string
          notes?: string | null
          scheduled_at?: string | null
        }
        Relationships: []
      }
      gate_passes: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          customer_name: string | null
          destination: string | null
          driver_name: string | null
          driver_phone: string | null
          factory_id: string | null
          gate_pass_number: string
          id: string
          notes: string | null
          pass_date: string
          pass_type: string
          purpose: string | null
          related_outward_id: string | null
          related_transfer_id: string | null
          status: string
          updated_at: string
          vehicle_number: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          destination?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          factory_id?: string | null
          gate_pass_number?: string
          id?: string
          notes?: string | null
          pass_date?: string
          pass_type?: string
          purpose?: string | null
          related_outward_id?: string | null
          related_transfer_id?: string | null
          status?: string
          updated_at?: string
          vehicle_number?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          destination?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          factory_id?: string | null
          gate_pass_number?: string
          id?: string
          notes?: string | null
          pass_date?: string
          pass_type?: string
          purpose?: string | null
          related_outward_id?: string | null
          related_transfer_id?: string | null
          status?: string
          updated_at?: string
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gate_passes_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_passes_related_outward_id_fkey"
            columns: ["related_outward_id"]
            isOneToOne: false
            referencedRelation: "stock_outwards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_passes_related_transfer_id_fkey"
            columns: ["related_transfer_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          product_id: string
          quantity: number
          reason: string | null
          reference: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: string
          product_id: string
          quantity: number
          reason?: string | null
          reference?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          product_id?: string
          quantity?: number
          reason?: string | null
          reference?: string | null
        }
        Relationships: []
      }
      lead_activities: {
        Row: {
          activity_type: string
          appointment_id: string | null
          completed: boolean
          content: string
          created_at: string
          created_by: string | null
          enquiry_id: string | null
          id: string
          scheduled_at: string | null
        }
        Insert: {
          activity_type?: string
          appointment_id?: string | null
          completed?: boolean
          content: string
          created_at?: string
          created_by?: string | null
          enquiry_id?: string | null
          id?: string
          scheduled_at?: string | null
        }
        Update: {
          activity_type?: string
          appointment_id?: string | null
          completed?: boolean
          content?: string
          created_at?: string
          created_by?: string | null
          enquiry_id?: string | null
          id?: string
          scheduled_at?: string | null
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          created_at: string
          created_by: string | null
          credit: number
          debit: number
          description: string | null
          entry_date: string
          entry_type: string
          id: string
          notes: string | null
          party_id: string
          payment_mode: string | null
          project_ref: string | null
          reference_number: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          credit?: number
          debit?: number
          description?: string | null
          entry_date?: string
          entry_type?: string
          id?: string
          notes?: string | null
          party_id: string
          payment_mode?: string | null
          project_ref?: string | null
          reference_number?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          credit?: number
          debit?: number
          description?: string | null
          entry_date?: string
          entry_type?: string
          id?: string
          notes?: string | null
          party_id?: string
          payment_mode?: string | null
          project_ref?: string | null
          reference_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      machinery: {
        Row: {
          available_quantity: number
          brand: string | null
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          model: string | null
          name: string
          notes: string | null
          purchase_date: string | null
          purchase_value: number | null
          section_id: string | null
          serial_number: string | null
          status: string
          total_quantity: number
          updated_at: string
        }
        Insert: {
          available_quantity?: number
          brand?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          model?: string | null
          name: string
          notes?: string | null
          purchase_date?: string | null
          purchase_value?: number | null
          section_id?: string | null
          serial_number?: string | null
          status?: string
          total_quantity?: number
          updated_at?: string
        }
        Update: {
          available_quantity?: number
          brand?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          model?: string | null
          name?: string
          notes?: string | null
          purchase_date?: string | null
          purchase_value?: number | null
          section_id?: string | null
          serial_number?: string | null
          status?: string
          total_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "machinery_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "machinery_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      machinery_handovers: {
        Row: {
          condition_in: string | null
          condition_out: string | null
          contractor_id: string
          created_at: string
          created_by: string | null
          expected_return_date: string | null
          id: string
          issue_date: string
          issued_by_name: string | null
          machinery_id: string
          notes: string | null
          quantity: number
          received_by_name: string | null
          return_date: string | null
          section_id: string | null
          site_location: string | null
          status: string
          updated_at: string
        }
        Insert: {
          condition_in?: string | null
          condition_out?: string | null
          contractor_id: string
          created_at?: string
          created_by?: string | null
          expected_return_date?: string | null
          id?: string
          issue_date?: string
          issued_by_name?: string | null
          machinery_id: string
          notes?: string | null
          quantity?: number
          received_by_name?: string | null
          return_date?: string | null
          section_id?: string | null
          site_location?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          condition_in?: string | null
          condition_out?: string | null
          contractor_id?: string
          created_at?: string
          created_by?: string | null
          expected_return_date?: string | null
          id?: string
          issue_date?: string
          issued_by_name?: string | null
          machinery_id?: string
          notes?: string | null
          quantity?: number
          received_by_name?: string | null
          return_date?: string | null
          section_id?: string | null
          site_location?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "machinery_handovers_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machinery_handovers_machinery_id_fkey"
            columns: ["machinery_id"]
            isOneToOne: false
            referencedRelation: "machinery"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machinery_handovers_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "machinery_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      machinery_sections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      material_approvals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          notes: string | null
          reference_id: string | null
          reference_number: string | null
          rejection_reason: string | null
          request_type: string
          requested_at: string
          requested_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          reference_id?: string | null
          reference_number?: string | null
          rejection_reason?: string | null
          request_type: string
          requested_at?: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          reference_id?: string | null
          reference_number?: string | null
          rejection_reason?: string | null
          request_type?: string
          requested_at?: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      material_stock: {
        Row: {
          current_stock: number
          factory_id: string
          id: string
          material_id: string
          reserved_stock: number
          updated_at: string
        }
        Insert: {
          current_stock?: number
          factory_id: string
          id?: string
          material_id: string
          reserved_stock?: number
          updated_at?: string
        }
        Update: {
          current_stock?: number
          factory_id?: string
          id?: string
          material_id?: string
          reserved_stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_stock_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_stock_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          barcode: string | null
          brand: string | null
          category: string
          created_at: string
          description: string | null
          gst_percent: number
          hsn_code: string | null
          id: string
          is_active: boolean
          material_type: string
          min_stock_alert: number
          name: string
          opening_stock: number
          purchase_rate: number
          safety_stock: number
          size: string | null
          sku: string | null
          supplier_id: string | null
          thickness: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          category: string
          created_at?: string
          description?: string | null
          gst_percent?: number
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          material_type?: string
          min_stock_alert?: number
          name: string
          opening_stock?: number
          purchase_rate?: number
          safety_stock?: number
          size?: string | null
          sku?: string | null
          supplier_id?: string | null
          thickness?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          category?: string
          created_at?: string
          description?: string | null
          gst_percent?: number
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          material_type?: string
          min_stock_alert?: number
          name?: string
          opening_stock?: number
          purchase_rate?: number
          safety_stock?: number
          size?: string | null
          sku?: string | null
          supplier_id?: string | null
          thickness?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          customization_notes: string | null
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          product_sku: string | null
          quantity: number
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          customization_notes?: string | null
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          product_sku?: string | null
          quantity?: number
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          customization_notes?: string | null
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          product_sku?: string | null
          quantity?: number
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          due_amount: number
          id: string
          invoice_generated_at: string | null
          invoice_number: string | null
          notes: string | null
          order_number: string
          paid_amount: number
          payment_method: string | null
          payment_status: string | null
          shipping_address_line1: string | null
          shipping_address_line2: string | null
          shipping_city: string | null
          shipping_pincode: string | null
          shipping_state: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_amount?: number
          id?: string
          invoice_generated_at?: string | null
          invoice_number?: string | null
          notes?: string | null
          order_number: string
          paid_amount?: number
          payment_method?: string | null
          payment_status?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_pincode?: string | null
          shipping_state?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_amount?: number
          id?: string
          invoice_generated_at?: string | null
          invoice_number?: string | null
          notes?: string | null
          order_number?: string
          paid_amount?: number
          payment_method?: string | null
          payment_status?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_pincode?: string | null
          shipping_state?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          ip_address: string | null
          page_path: string
          page_title: string | null
          referrer: string | null
          region: string | null
          user_agent: string | null
          visitor_id: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          ip_address?: string | null
          page_path: string
          page_title?: string | null
          referrer?: string | null
          region?: string | null
          user_agent?: string | null
          visitor_id: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          ip_address?: string | null
          page_path?: string
          page_title?: string | null
          referrer?: string | null
          region?: string | null
          user_agent?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      pages: {
        Row: {
          content: string | null
          created_at: string
          created_by: string | null
          excerpt: string | null
          featured_image_url: string | null
          id: string
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          sort_order: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          sort_order?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          sort_order?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      parties: {
        Row: {
          billing_address: string | null
          city: string | null
          company: string | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          credit_limit: number
          email: string | null
          gstin: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          opening_balance: number
          pan: string | null
          party_type: string
          phone: string | null
          pincode: string | null
          site_location: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          billing_address?: string | null
          city?: string | null
          company?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number
          email?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          opening_balance?: number
          pan?: string | null
          party_type?: string
          phone?: string | null
          pincode?: string | null
          site_location?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          billing_address?: string | null
          city?: string | null
          company?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number
          email?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          opening_balance?: number
          pan?: string | null
          party_type?: string
          phone?: string | null
          pincode?: string | null
          site_location?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      party_addresses: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          company: string | null
          consignee_name: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          gstin: string | null
          id: string
          is_default: boolean
          label: string
          party_id: string
          pincode: string | null
          state: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company?: string | null
          consignee_name?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          is_default?: boolean
          label: string
          party_id: string
          pincode?: string | null
          state?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company?: string | null
          consignee_name?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          is_default?: boolean
          label?: string
          party_id?: string
          pincode?: string | null
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "party_addresses_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          body: string | null
          created_at: string
          helpful_count: number
          id: string
          product_id: string | null
          product_slug: string | null
          rating: number
          reviewer_email: string | null
          reviewer_name: string
          reviewer_phone: string | null
          status: string
          title: string | null
          updated_at: string
          verified_purchase: boolean
        }
        Insert: {
          body?: string | null
          created_at?: string
          helpful_count?: number
          id?: string
          product_id?: string | null
          product_slug?: string | null
          rating: number
          reviewer_email?: string | null
          reviewer_name: string
          reviewer_phone?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          verified_purchase?: boolean
        }
        Update: {
          body?: string | null
          created_at?: string
          helpful_count?: number
          id?: string
          product_id?: string | null
          product_slug?: string | null
          rating?: number
          reviewer_email?: string | null
          reviewer_name?: string
          reviewer_phone?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          verified_purchase?: boolean
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          color: string | null
          created_at: string
          currency: string | null
          gtin: string | null
          id: string
          image_url: string | null
          in_stock: boolean
          is_active: boolean
          item_group_id: string | null
          material: string | null
          mpn: string | null
          pattern: string | null
          price: number | null
          product_id: string
          sale_price: number | null
          size: string | null
          sku: string | null
          sort_order: number | null
          stock_quantity: number
          title: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          currency?: string | null
          gtin?: string | null
          id?: string
          image_url?: string | null
          in_stock?: boolean
          is_active?: boolean
          item_group_id?: string | null
          material?: string | null
          mpn?: string | null
          pattern?: string | null
          price?: number | null
          product_id: string
          sale_price?: number | null
          size?: string | null
          sku?: string | null
          sort_order?: number | null
          stock_quantity?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          currency?: string | null
          gtin?: string | null
          id?: string
          image_url?: string | null
          in_stock?: boolean
          is_active?: boolean
          item_group_id?: string | null
          material?: string | null
          mpn?: string | null
          pattern?: string | null
          price?: number | null
          product_id?: string
          sale_price?: number | null
          size?: string | null
          sku?: string | null
          sort_order?: number | null
          stock_quantity?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      production_logs: {
        Row: {
          created_at: string
          created_by: string | null
          department_progress: Json
          factory_id: string
          id: string
          is_ready_for_dispatch: boolean
          log_date: string
          notes: string | null
          product_type: string
          project_name: string | null
          quantity_produced: number
          shift: string | null
          supervisor_name: string | null
          updated_at: string
          workflow_status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_progress?: Json
          factory_id: string
          id?: string
          is_ready_for_dispatch?: boolean
          log_date?: string
          notes?: string | null
          product_type: string
          project_name?: string | null
          quantity_produced?: number
          shift?: string | null
          supervisor_name?: string | null
          updated_at?: string
          workflow_status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_progress?: Json
          factory_id?: string
          id?: string
          is_ready_for_dispatch?: boolean
          log_date?: string
          notes?: string | null
          product_type?: string
          project_name?: string | null
          quantity_produced?: number
          shift?: string | null
          supervisor_name?: string | null
          updated_at?: string
          workflow_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_logs_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          additional_image_urls: string[] | null
          age_group: string | null
          brand: string | null
          category: string
          category_slug: string
          color: string | null
          condition: string | null
          created_at: string
          currency: string | null
          custom_label_0: string | null
          custom_label_1: string | null
          custom_label_2: string | null
          custom_label_3: string | null
          custom_label_4: string | null
          description: string | null
          features: string[] | null
          gender: string | null
          google_product_category: string | null
          gtin: string | null
          id: string
          identifier_exists: boolean | null
          image_url: string | null
          in_stock: boolean | null
          is_featured: boolean | null
          item_group_id: string | null
          low_stock_threshold: number
          material: string | null
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          mpn: string | null
          name: string
          pattern: string | null
          price: number | null
          product_type: string | null
          sale_price: number | null
          sale_price_effective_from: string | null
          sale_price_effective_to: string | null
          shipping_height_cm: number | null
          shipping_length_cm: number | null
          shipping_weight_kg: number | null
          shipping_width_cm: number | null
          short_description: string | null
          size: string | null
          sku: string | null
          slug: string
          sort_order: number | null
          specifications: Json | null
          stock_quantity: number
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          additional_image_urls?: string[] | null
          age_group?: string | null
          brand?: string | null
          category: string
          category_slug: string
          color?: string | null
          condition?: string | null
          created_at?: string
          currency?: string | null
          custom_label_0?: string | null
          custom_label_1?: string | null
          custom_label_2?: string | null
          custom_label_3?: string | null
          custom_label_4?: string | null
          description?: string | null
          features?: string[] | null
          gender?: string | null
          google_product_category?: string | null
          gtin?: string | null
          id?: string
          identifier_exists?: boolean | null
          image_url?: string | null
          in_stock?: boolean | null
          is_featured?: boolean | null
          item_group_id?: string | null
          low_stock_threshold?: number
          material?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          mpn?: string | null
          name: string
          pattern?: string | null
          price?: number | null
          product_type?: string | null
          sale_price?: number | null
          sale_price_effective_from?: string | null
          sale_price_effective_to?: string | null
          shipping_height_cm?: number | null
          shipping_length_cm?: number | null
          shipping_weight_kg?: number | null
          shipping_width_cm?: number | null
          short_description?: string | null
          size?: string | null
          sku?: string | null
          slug: string
          sort_order?: number | null
          specifications?: Json | null
          stock_quantity?: number
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          additional_image_urls?: string[] | null
          age_group?: string | null
          brand?: string | null
          category?: string
          category_slug?: string
          color?: string | null
          condition?: string | null
          created_at?: string
          currency?: string | null
          custom_label_0?: string | null
          custom_label_1?: string | null
          custom_label_2?: string | null
          custom_label_3?: string | null
          custom_label_4?: string | null
          description?: string | null
          features?: string[] | null
          gender?: string | null
          google_product_category?: string | null
          gtin?: string | null
          id?: string
          identifier_exists?: boolean | null
          image_url?: string | null
          in_stock?: boolean | null
          is_featured?: boolean | null
          item_group_id?: string | null
          low_stock_threshold?: number
          material?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          mpn?: string | null
          name?: string
          pattern?: string | null
          price?: number | null
          product_type?: string | null
          sale_price?: number | null
          sale_price_effective_from?: string | null
          sale_price_effective_to?: string | null
          shipping_height_cm?: number | null
          shipping_length_cm?: number | null
          shipping_weight_kg?: number | null
          shipping_width_cm?: number | null
          short_description?: string | null
          size?: string | null
          sku?: string | null
          slug?: string
          sort_order?: number | null
          specifications?: Json | null
          stock_quantity?: number
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          company: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          pincode: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_allocation_items: {
        Row: {
          allocation_id: string
          created_at: string
          id: string
          issued_quantity: number
          material_id: string
          notes: string | null
          planned_quantity: number
          rate: number | null
        }
        Insert: {
          allocation_id: string
          created_at?: string
          id?: string
          issued_quantity?: number
          material_id: string
          notes?: string | null
          planned_quantity?: number
          rate?: number | null
        }
        Update: {
          allocation_id?: string
          created_at?: string
          id?: string
          issued_quantity?: number
          material_id?: string
          notes?: string | null
          planned_quantity?: number
          rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_allocation_items_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "project_allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_allocation_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      project_allocations: {
        Row: {
          client_name: string | null
          created_at: string
          created_by: string | null
          end_date: string | null
          factory_id: string | null
          id: string
          notes: string | null
          party_id: string | null
          project_name: string
          quotation_id: string | null
          sales_order_id: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          factory_id?: string | null
          id?: string
          notes?: string | null
          party_id?: string | null
          project_name: string
          quotation_id?: string | null
          sales_order_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          factory_id?: string | null
          id?: string
          notes?: string | null
          party_id?: string | null
          project_name?: string
          quotation_id?: string | null
          sales_order_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_allocations_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_allocations_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_allocations_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_allocations_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          amount: number
          created_at: string
          id: string
          material_id: string
          notes: string | null
          po_id: string
          quantity: number
          rate: number
          received_quantity: number
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          material_id: string
          notes?: string | null
          po_id: string
          quantity?: number
          rate?: number
          received_quantity?: number
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          material_id?: string
          notes?: string | null
          po_id?: string
          quantity?: number
          rate?: number
          received_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          expected_delivery_date: string | null
          factory_id: string | null
          gst_amount: number | null
          id: string
          notes: string | null
          po_date: string
          po_number: string
          status: string
          subtotal: number | null
          supplier_id: string | null
          terms: string | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_delivery_date?: string | null
          factory_id?: string | null
          gst_amount?: number | null
          id?: string
          notes?: string | null
          po_date?: string
          po_number?: string
          status?: string
          subtotal?: number | null
          supplier_id?: string | null
          terms?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_delivery_date?: string | null
          factory_id?: string | null
          gst_amount?: number | null
          id?: string
          notes?: string | null
          po_date?: string
          po_number?: string
          status?: string
          subtotal?: number | null
          supplier_id?: string | null
          terms?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          created_at: string
          description: string
          id: string
          quantity: number
          quotation_id: string
          sort_order: number | null
          total_price: number
          unit: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          quantity?: number
          quotation_id: string
          sort_order?: number | null
          total_price?: number
          unit?: string | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          quantity?: number
          quotation_id?: string
          sort_order?: number | null
          total_price?: number
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          client_address: string | null
          client_company: string | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          created_by: string | null
          gst_amount: number | null
          gst_percent: number | null
          id: string
          notes: string | null
          party_id: string | null
          quotation_number: string
          status: string
          subject: string | null
          subtotal: number | null
          terms: string | null
          total_amount: number | null
          updated_at: string
          validity_days: number | null
        }
        Insert: {
          client_address?: string | null
          client_company?: string | null
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          gst_amount?: number | null
          gst_percent?: number | null
          id?: string
          notes?: string | null
          party_id?: string | null
          quotation_number?: string
          status?: string
          subject?: string | null
          subtotal?: number | null
          terms?: string | null
          total_amount?: number | null
          updated_at?: string
          validity_days?: number | null
        }
        Update: {
          client_address?: string | null
          client_company?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          gst_amount?: number | null
          gst_percent?: number | null
          id?: string
          notes?: string | null
          party_id?: string | null
          quotation_number?: string
          status?: string
          subject?: string | null
          subtotal?: number | null
          terms?: string | null
          total_amount?: number | null
          updated_at?: string
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_assets: {
        Row: {
          cabin_id: string
          cabin_type: string
          created_at: string
          current_factory_id: string | null
          current_location: string | null
          id: string
          manufacture_date: string | null
          monthly_rent: number | null
          notes: string | null
          purchase_cost: number | null
          qr_code: string | null
          size: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cabin_id: string
          cabin_type: string
          created_at?: string
          current_factory_id?: string | null
          current_location?: string | null
          id?: string
          manufacture_date?: string | null
          monthly_rent?: number | null
          notes?: string | null
          purchase_cost?: number | null
          qr_code?: string | null
          size?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cabin_id?: string
          cabin_type?: string
          created_at?: string
          current_factory_id?: string | null
          current_location?: string | null
          id?: string
          manufacture_date?: string | null
          monthly_rent?: number | null
          notes?: string | null
          purchase_cost?: number | null
          qr_code?: string | null
          size?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_assets_current_factory_id_fkey"
            columns: ["current_factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_assignments: {
        Row: {
          actual_return_date: string | null
          asset_id: string
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          damage_charges: number | null
          damage_notes: string | null
          deposit_amount: number | null
          deposit_refund_date: string | null
          deposit_refunded_amount: number
          deposit_status: string
          dispatch_date: string | null
          expected_return_date: string | null
          id: string
          monthly_rate: number | null
          notes: string | null
          party_id: string | null
          site_address: string | null
          status: string
          updated_at: string
        }
        Insert: {
          actual_return_date?: string | null
          asset_id: string
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          damage_charges?: number | null
          damage_notes?: string | null
          deposit_amount?: number | null
          deposit_refund_date?: string | null
          deposit_refunded_amount?: number
          deposit_status?: string
          dispatch_date?: string | null
          expected_return_date?: string | null
          id?: string
          monthly_rate?: number | null
          notes?: string | null
          party_id?: string | null
          site_address?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          actual_return_date?: string | null
          asset_id?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          damage_charges?: number | null
          damage_notes?: string | null
          deposit_amount?: number | null
          deposit_refund_date?: string | null
          deposit_refunded_amount?: number
          deposit_status?: string
          dispatch_date?: string | null
          expected_return_date?: string | null
          id?: string
          monthly_rate?: number | null
          notes?: string | null
          party_id?: string | null
          site_address?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_assignments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "rental_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_assignments_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_maintenance: {
        Row: {
          asset_id: string
          cost: number | null
          created_at: string
          description: string | null
          id: string
          maintenance_date: string
          maintenance_type: string
          performed_by: string | null
        }
        Insert: {
          asset_id: string
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          maintenance_date?: string
          maintenance_type: string
          performed_by?: string | null
        }
        Update: {
          asset_id?: string
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          maintenance_date?: string
          maintenance_type?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_maintenance_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "rental_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_items: {
        Row: {
          created_at: string
          description: string
          id: string
          quantity: number
          sales_order_id: string
          sort_order: number | null
          total_price: number
          unit: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          quantity?: number
          sales_order_id: string
          sort_order?: number | null
          total_price?: number
          unit?: string | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          quantity?: number
          sales_order_id?: string
          sort_order?: number | null
          total_price?: number
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          client_address: string | null
          client_company: string | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          created_by: string | null
          delivery_date: string | null
          gst_amount: number | null
          gst_percent: number | null
          id: string
          notes: string | null
          party_id: string | null
          payment_status: string
          quotation_id: string | null
          so_number: string
          status: string
          subtotal: number | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          client_address?: string | null
          client_company?: string | null
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          delivery_date?: string | null
          gst_amount?: number | null
          gst_percent?: number | null
          id?: string
          notes?: string | null
          party_id?: string | null
          payment_status?: string
          quotation_id?: string | null
          so_number?: string
          status?: string
          subtotal?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          client_address?: string | null
          client_company?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          delivery_date?: string | null
          gst_amount?: number | null
          gst_percent?: number | null
          id?: string
          notes?: string | null
          party_id?: string | null
          payment_status?: string
          quotation_id?: string | null
          so_number?: string
          status?: string
          subtotal?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      scrap_records: {
        Row: {
          buyer_name: string | null
          buyer_phone: string | null
          created_at: string
          created_by: string | null
          factory_id: string | null
          id: string
          material_name: string
          notes: string | null
          quantity: number
          rate: number | null
          scrap_date: string
          status: string
          team_name: string | null
          total_amount: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string
          created_by?: string | null
          factory_id?: string | null
          id?: string
          material_name: string
          notes?: string | null
          quantity?: number
          rate?: number | null
          scrap_date?: string
          status?: string
          team_name?: string | null
          total_amount?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string
          created_by?: string | null
          factory_id?: string | null
          id?: string
          material_name?: string
          notes?: string | null
          quantity?: number
          rate?: number | null
          scrap_date?: string
          status?: string
          team_name?: string | null
          total_amount?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrap_records_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          description: string | null
          id: string
          priority: string
          request_type: string
          resolution_notes: string | null
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          description?: string | null
          id?: string
          priority?: string
          request_type?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          description?: string | null
          id?: string
          priority?: string
          request_type?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      spec_documents: {
        Row: {
          client_name: string | null
          created_at: string
          created_by: string | null
          doc_date: string | null
          id: string
          project_details: string | null
          ref_number: string | null
          sections: Json
          updated_at: string
        }
        Insert: {
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          doc_date?: string | null
          id?: string
          project_details?: string | null
          ref_number?: string | null
          sections?: Json
          updated_at?: string
        }
        Update: {
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          doc_date?: string | null
          id?: string
          project_details?: string | null
          ref_number?: string | null
          sections?: Json
          updated_at?: string
        }
        Relationships: []
      }
      stock_inward_items: {
        Row: {
          amount: number
          created_at: string
          id: string
          inward_id: string
          material_id: string
          notes: string | null
          qc_passed: boolean | null
          quantity: number
          rate: number
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          inward_id: string
          material_id: string
          notes?: string | null
          qc_passed?: boolean | null
          quantity?: number
          rate?: number
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          inward_id?: string
          material_id?: string
          notes?: string | null
          qc_passed?: boolean | null
          quantity?: number
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_inward_items_inward_id_fkey"
            columns: ["inward_id"]
            isOneToOne: false
            referencedRelation: "stock_inwards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_inward_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_inwards: {
        Row: {
          created_at: string
          created_by: string | null
          factory_id: string
          id: string
          invoice_date: string | null
          invoice_number: string | null
          invoice_url: string | null
          inward_number: string
          notes: string | null
          qc_notes: string | null
          qc_status: string
          supplier_id: string | null
          total_amount: number | null
          updated_at: string
          vehicle_number: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          factory_id: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_url?: string | null
          inward_number?: string
          notes?: string | null
          qc_notes?: string | null
          qc_status?: string
          supplier_id?: string | null
          total_amount?: number | null
          updated_at?: string
          vehicle_number?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          factory_id?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_url?: string | null
          inward_number?: string
          notes?: string | null
          qc_notes?: string | null
          qc_status?: string
          supplier_id?: string | null
          total_amount?: number | null
          updated_at?: string
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_inwards_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_inwards_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_outward_items: {
        Row: {
          amount: number
          created_at: string
          id: string
          material_id: string
          notes: string | null
          outward_id: string
          quantity: number
          rate: number
          wastage: number
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          material_id: string
          notes?: string | null
          outward_id: string
          quantity?: number
          rate?: number
          wastage?: number
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          material_id?: string
          notes?: string | null
          outward_id?: string
          quantity?: number
          rate?: number
          wastage?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_outward_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_outward_items_outward_id_fkey"
            columns: ["outward_id"]
            isOneToOne: false
            referencedRelation: "stock_outwards"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_outwards: {
        Row: {
          created_at: string
          created_by: string | null
          factory_id: string
          id: string
          issued_to: string | null
          notes: string | null
          outward_number: string
          party_id: string | null
          project_id: string | null
          project_name: string | null
          purpose: string
          quotation_id: string | null
          sales_order_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          factory_id: string
          id?: string
          issued_to?: string | null
          notes?: string | null
          outward_number?: string
          party_id?: string | null
          project_id?: string | null
          project_name?: string | null
          purpose?: string
          quotation_id?: string | null
          sales_order_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          factory_id?: string
          id?: string
          issued_to?: string | null
          notes?: string | null
          outward_number?: string
          party_id?: string | null
          project_id?: string | null
          project_name?: string | null
          purpose?: string
          quotation_id?: string | null
          sales_order_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_outwards_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_outwards_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_outwards_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_outwards_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfer_items: {
        Row: {
          created_at: string
          id: string
          material_id: string
          notes: string | null
          quantity: number
          transfer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          notes?: string | null
          quantity?: number
          transfer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          notes?: string | null
          quantity?: number
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfer_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          created_at: string
          created_by: string | null
          driver_name: string | null
          from_factory_id: string
          id: string
          notes: string | null
          status: string
          to_factory_id: string
          transfer_number: string
          updated_at: string
          vehicle_number: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          driver_name?: string | null
          from_factory_id: string
          id?: string
          notes?: string | null
          status?: string
          to_factory_id: string
          transfer_number?: string
          updated_at?: string
          vehicle_number?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          driver_name?: string | null
          from_factory_id?: string
          id?: string
          notes?: string | null
          status?: string
          to_factory_id?: string
          transfer_number?: string
          updated_at?: string
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_from_factory_id_fkey"
            columns: ["from_factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_factory_id_fkey"
            columns: ["to_factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          gst_number: string | null
          id: string
          lead_time_days: number | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          lead_time_days?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          lead_time_days?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string
          related_enquiry_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          related_enquiry_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          related_enquiry_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_orders: {
        Row: {
          assigned_supervisor: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          created_by: string | null
          factory_id: string | null
          id: string
          notes: string | null
          priority: string
          product_type: string
          project_name: string
          quantity: number
          quotation_id: string | null
          sales_order_id: string | null
          size: string | null
          specifications: string | null
          start_date: string | null
          status: string
          target_date: string | null
          updated_at: string
          wo_date: string
          wo_number: string
        }
        Insert: {
          assigned_supervisor?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          factory_id?: string | null
          id?: string
          notes?: string | null
          priority?: string
          product_type: string
          project_name: string
          quantity?: number
          quotation_id?: string | null
          sales_order_id?: string | null
          size?: string | null
          specifications?: string | null
          start_date?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
          wo_date?: string
          wo_number?: string
        }
        Update: {
          assigned_supervisor?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          factory_id?: string | null
          id?: string
          notes?: string | null
          priority?: string
          product_type?: string
          project_name?: string
          quantity?: number
          quotation_id?: string | null
          sales_order_id?: string | null
          size?: string | null
          specifications?: string | null
          start_date?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
          wo_date?: string
          wo_number?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_material_stock: {
        Args: { _delta: number; _factory_id: string; _material_id: string }
        Returns: undefined
      }
      admin_list_reviews: {
        Args: { _status?: string }
        Returns: {
          body: string | null
          created_at: string
          helpful_count: number
          id: string
          product_id: string | null
          product_slug: string | null
          rating: number
          reviewer_email: string | null
          reviewer_name: string
          reviewer_phone: string | null
          status: string
          title: string | null
          updated_at: string
          verified_purchase: boolean
        }[]
        SetofOptions: {
          from: "*"
          to: "product_reviews"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "staff"
      order_status:
        | "pending"
        | "confirmed"
        | "manufacturing"
        | "quality_check"
        | "dispatched"
        | "in_transit"
        | "delivered"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff"],
      order_status: [
        "pending",
        "confirmed",
        "manufacturing",
        "quality_check",
        "dispatched",
        "in_transit",
        "delivered",
        "cancelled",
      ],
    },
  },
} as const
