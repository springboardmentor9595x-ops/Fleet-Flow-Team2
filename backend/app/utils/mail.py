import smtplib
import socket
import os
import threading
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

def _save_mock_email(to_email: str, subject: str, html_body: str, filename_prefix: str = "email") -> None:
    try:
        os.makedirs("mock_emails", exist_ok=True)
        safe_email = to_email.replace("@", "_at_").replace(".", "_")
        filename = f"mock_emails/{filename_prefix}_{safe_email}.html"
        with open(filename, "w", encoding="utf-8") as f:
            f.write(html_body)
        print(f"[FleetFlow SMTP] Saved mock email layout [{subject.upper()}] to local file: {os.path.abspath(filename)}")
    except Exception as ex:
        print(f"[FleetFlow SMTP] Failed to write mock email layout: {ex}")

def send_otp_email(to_email: str, otp: str) -> bool:
    try:
        html_body = f"""
        <html>
        <body style="background-color: #0b0c16; color: #e2e8f0; font-family: monospace; padding: 24px; text-align: center;">
            <div style="max-width: 480px; margin: 0 auto; background-color: #161726; border: 1px solid #00f0ff; border-radius: 12px; padding: 32px; box-shadow: 0 8px 32px rgba(0,0,0,0.5);">
                <h2 style="color: #ffffff; letter-spacing: 2px; margin-bottom: 4px;">FLEETFLOW</h2>
                <p style="color: #00f0ff; font-size: 10px; text-transform: uppercase; margin-top: 0; margin-bottom: 24px; letter-spacing: 1px;">
                    // Connecting Fleets. Flowing Logistics.
                </p>
                <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px; margin-bottom: 24px;">
                    <p style="font-size: 12px; color: #a0aec0; margin-bottom: 8px;">YOUR OPERATOR GATEWAY ACTIVATION KEY IS:</p>
                    <div style="background-color: #090a10; border: 1px dashed rgba(0, 240, 255, 0.4); border-radius: 8px; font-size: 32px; font-weight: bold; color: #39ff14; letter-spacing: 6px; padding: 16px; margin: 16px 0;">
                        {otp}
                    </div>
                    <p style="font-size: 10px; color: #718096; margin-top: 16px;">
                        * This code will expire in 4 minutes. Do not share this key with unauthorized dispatch elements.
                    </p>
                </div>
                <div style="font-size: 8px; color: #4a5568; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px;">
                    SYSTEM SECURED BY FLEETFLOW CRYPTO NODE // PORT 443
                </div>
            </div>
        </body>
        </html>
        """
        
        if not settings.smtp_user or not settings.smtp_password:
            print("[FleetFlow SMTP] SMTP credentials not set. Simulating OTP email dispatch.")
            _save_mock_email(to_email, "Security Activation OTP", html_body, f"otp_{otp}")
            return True

        msg = MIMEMultipart()
        msg['From'] = settings.smtp_user
        msg['To'] = to_email
        msg['Subject'] = "FleetFlow Security Activation Code"
        msg.attach(MIMEText(html_body, 'html'))

        if settings.smtp_port == 465:
            server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=5.0)
        else:
            server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=5.0)
            server.starttls()

        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_user, to_email, msg.as_string())
        server.quit()
        
        print(f"[FleetFlow SMTP] Successfully dispatched activation key to {to_email}")
        return True
    except Exception as e:
        print(f"[FleetFlow SMTP] Error encountered while dispatching SMTP mail: {e}")
        return False

def send_welcome_email(to_email: str, full_name: str, role: str) -> bool:
    try:
        html_body = f"""
        <html>
        <body style="background-color: #0b0c16; color: #e2e8f0; font-family: monospace; padding: 24px; text-align: center;">
            <div style="max-width: 480px; margin: 0 auto; background-color: #161726; border: 1px solid #39ff14; border-radius: 12px; padding: 32px; box-shadow: 0 8px 32px rgba(0,0,0,0.5);">
                <h2 style="color: #ffffff; letter-spacing: 2px; margin-bottom: 4px;">FLEETFLOW</h2>
                <p style="color: #39ff14; font-size: 10px; text-transform: uppercase; margin-top: 0; margin-bottom: 24px; letter-spacing: 1px;">
                    // Operator Onboarding Sequence Initiated
                </p>
                <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px; margin-bottom: 24px; text-align: left;">
                    <p style="font-size: 14px; color: #ffffff; margin-bottom: 16px;">Welcome aboard, <strong>{full_name}</strong>!</p>
                    <p style="font-size: 12px; color: #a0aec0; line-height: 1.6; margin-bottom: 16px;">
                        Your operator profile has been compiled successfully. You have been cleared to connect to the logistics grid with the following access parameters:
                    </p>
                    <div style="background-color: #090a10; border-left: 3px solid #00f0ff; padding: 12px; border-radius: 4px; margin-bottom: 20px;">
                        <span style="font-size: 10px; color: #718096; text-transform: uppercase; display: block;">Clearance Level:</span>
                        <strong style="font-size: 14px; color: #00f0ff; font-family: monospace;">{role}</strong>
                    </div>
                    <p style="font-size: 12px; color: #a0aec0; line-height: 1.6; margin-bottom: 8px;">
                        You are now cleared to log in, deploy shipping manifests, monitor real-time map telemetries, and provision vehicles in the fleet registry.
                    </p>
                </div>
                <div style="font-size: 8px; color: #4a5568; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px;">
                    ONBOARDING SYSTEM COMPILED // PORT 443 SECURED
                </div>
            </div>
        </body>
        </html>
        """
        
        if not settings.smtp_user or not settings.smtp_password:
            print("[FleetFlow SMTP] SMTP credentials not set. Simulating Welcome onboarding email.")
            _save_mock_email(to_email, "Welcome to FleetFlow", html_body, "welcome")
            return True

        msg = MIMEMultipart()
        msg['From'] = settings.smtp_user
        msg['To'] = to_email
        msg['Subject'] = "Welcome to FleetFlow Logistics Hub!"
        msg.attach(MIMEText(html_body, 'html'))

        if settings.smtp_port == 465:
            server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=5.0)
        else:
            server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=5.0)
            server.starttls()

        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_user, to_email, msg.as_string())
        server.quit()
        
        print(f"[FleetFlow SMTP] Welcome onboarding email successfully sent to {to_email}")
        return True
    except Exception as e:
        print(f"[FleetFlow SMTP] Welcome onboarding email dispatch failure: {e}")
        return False

def send_password_changed_email(to_email: str, full_name: str) -> bool:
    try:
        html_body = f"""
        <html>
        <body style="background-color: #0b0c16; color: #e2e8f0; font-family: monospace; padding: 24px; text-align: center;">
            <div style="max-width: 480px; margin: 0 auto; background-color: #161726; border: 1px solid #ff007f; border-radius: 12px; padding: 32px; box-shadow: 0 8px 32px rgba(0,0,0,0.5);">
                <h2 style="color: #ffffff; letter-spacing: 2px; margin-bottom: 4px;">FLEETFLOW</h2>
                <p style="color: #ff007f; font-size: 10px; text-transform: uppercase; margin-top: 0; margin-bottom: 24px; letter-spacing: 1px;">
                    // Security Clearance Update Detected
                </p>
                <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px; margin-bottom: 24px; text-align: left;">
                    <p style="font-size: 14px; color: #ffffff; margin-bottom: 16px;">Hello, <strong>{full_name}</strong>,</p>
                    <p style="font-size: 12px; color: #a0aec0; line-height: 1.6; margin-bottom: 16px;">
                        This email confirms that your FleetFlow operator portal password has been updated.
                    </p>
                    <div style="background-color: #090a10; border-left: 3px solid #ff007f; padding: 12px; border-radius: 4px; margin-bottom: 20px;">
                        <span style="font-size: 10px; color: #718096; text-transform: uppercase; display: block;">Status:</span>
                        <strong style="font-size: 12px; color: #ff007f; font-family: monospace;">Password successfully changed</strong>
                    </div>
                    <p style="font-size: 11px; color: #e2e8f0; line-height: 1.6; margin-bottom: 8px;">
                        * If you did not authorize this action, please coordinate with a system override administrator immediately to lock and secure your login credentials.
                    </p>
                </div>
                <div style="font-size: 8px; color: #4a5568; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px;">
                    SECURITY MODULE COMPILED // PORT 443 SECURED
                </div>
            </div>
        </body>
        </html>
        """
        
        if not settings.smtp_user or not settings.smtp_password:
            print("[FleetFlow SMTP] SMTP credentials not set. Simulating Password Changed email notification.")
            _save_mock_email(to_email, "Security Alert - Password Updated", html_body, "password_changed")
            return True

        msg = MIMEMultipart()
        msg['From'] = settings.smtp_user
        msg['To'] = to_email
        msg['Subject'] = "FleetFlow Security Alert: Password Updated"
        msg.attach(MIMEText(html_body, 'html'))

        if settings.smtp_port == 465:
            server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=5.0)
        else:
            server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=5.0)
            server.starttls()

        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_user, to_email, msg.as_string())
        server.quit()
        
        print(f"[FleetFlow SMTP] Password change notification email successfully sent to {to_email}")
        return True
    except Exception as e:
        print(f"[FleetFlow SMTP] Password change notification email dispatch failure: {e}")
        return False

def send_shipment_status_email(
    to_email: str,
    tracking_number: str,
    customer_name: str,
    status: str,
    source: str,
    destination: str,
    driver_name: str | None = None,
    vehicle_plate: str | None = None,
    checkpoint_city: str | None = None,
    distance_remaining: float | None = None,
    eta_str: str | None = None,
    stage: str | None = None
) -> bool:
    try:
        status_key = (stage or status).lower()
        driver_display = driver_name or "Assigned Operator"
        vehicle_display = vehicle_plate or "Fleet Transport Unit"
        
        # Determine 4-stage timeline index (0: Ordered, 1: Packed, 2: In Transit, 3: Delivered)
        step_idx = 0
        if status_key in ["created", "registered", "ordered"]:
            step_idx = 0
            accent_color = "#e11d48"  # Crimson Red
            status_label = "ORDERED // MANIFEST REGISTERED"
            subject = f"FleetFlow Alert: Your Shipment {tracking_number} is Ordered"
            status_message = f"We have received your shipment request! Driver <strong>{driver_display}</strong> and Vehicle <strong>{vehicle_display}</strong> have been allocated. Your order is confirmed and moving to packing."
        
        elif status_key in ["assigned", "packed", "scheduled", "trip_scheduled"]:
            step_idx = 1
            accent_color = "#e11d48"
            status_label = "PACKED // VEHICLE LOADED"
            subject = f"FleetFlow Alert: Your Order {tracking_number} is Packed & Ready"
            status_message = f"Your shipment is packed and loaded onto vehicle <strong>{vehicle_display}</strong>! Driver <strong>{driver_display}</strong> will begin transit on route <strong>{source.upper()} → {destination.upper()}</strong> shortly."
            
        elif status_key in ["departure", "departed", "in transit", "delayed", "checkpoint", "milestone", "proximity_2km", "out_for_delivery"]:
            step_idx = 2
            accent_color = "#e11d48"
            if status_key in ["checkpoint", "milestone"]:
                city_str = checkpoint_city.upper() if checkpoint_city else "INTERMEDIATE WAYPOINT"
                status_label = f"IN TRANSIT // NEAR {city_str}"
                subject = f"FleetFlow Update: Shipment {tracking_number} is In Transit near {city_str}"
                dist_text = f" ({distance_remaining} km remaining)" if distance_remaining is not None else ""
                eta_text = f", ETA: ~{eta_str}" if eta_str else ""
                status_message = f"In-Transit Update: Vehicle <strong>{vehicle_display}</strong> is currently near <strong>{city_str}</strong>{dist_text}{eta_text} heading towards {destination.upper()}."
            elif status_key in ["proximity_2km", "out_for_delivery"]:
                status_label = "IN TRANSIT // OUT FOR DELIVERY (2 KM)"
                subject = f"FleetFlow Alert: Shipment {tracking_number} is 2 KM Away!"
                eta_text = f" in approximately {eta_str}" if eta_str else " shortly"
                status_message = f"Out for Delivery! Driver <strong>{driver_display}</strong> is within 2 km of destination <strong>{destination.upper()}</strong>{eta_text}. Please be ready to receive your cargo."
            else:
                status_label = "IN TRANSIT // ON THE ROAD"
                subject = f"FleetFlow Alert: Your Shipment {tracking_number} is In Transit"
                status_message = f"Driver <strong>{driver_display}</strong> in vehicle <strong>{vehicle_display}</strong> has departed <strong>{source.upper()}</strong> and is actively in transit towards <strong>{destination.upper()}</strong>."

        elif status_key in ["completed", "delivered", "arrived"]:
            step_idx = 3
            accent_color = "#10b981"  # Emerald Green
            status_label = "DELIVERED // SAFELY RECEIVED"
            subject = f"FleetFlow Alert: Your Shipment {tracking_number} Has Been Delivered!"
            status_message = f"Great news! Your shipment has safely arrived at destination (<strong>{destination.upper()}</strong>). Thank you for shipping with FleetFlow!"

        elif status_key == "cancelled":
            step_idx = 0
            accent_color = "#ef4444"
            status_label = "CANCELLED"
            subject = f"FleetFlow Alert: Shipment {tracking_number} Cancelled"
            status_message = "Your shipment has been cancelled. If this was an error, please coordinate with system dispatch."
        else:
            step_idx = 1
            accent_color = "#f59e0b"
            status_label = status.upper()
            subject = f"FleetFlow Alert: Shipment {tracking_number} Status Update"
            status_message = f"Your shipment status has updated to {status.upper()} on route {source.upper()} → {destination.upper()}."

        # Compute dynamic progress bar styles
        conn1_color = "#e11d48" if step_idx >= 1 else "#334155"
        pack_bg = "#e11d48" if step_idx >= 1 else "#1e293b"
        pack_border = "#e11d48" if step_idx >= 1 else "#475569"
        pack_text = "#e11d48" if step_idx >= 1 else "#64748b"
        
        conn2_color = "#e11d48" if step_idx >= 2 else "#334155"
        transit_bg = "#e11d48" if step_idx >= 2 else "#1e293b"
        transit_border = "#e11d48" if step_idx >= 2 else "#475569"
        transit_text = "#e11d48" if step_idx >= 2 else "#64748b"
        
        conn3_color = "#10b981" if step_idx >= 3 else "#334155"
        deliv_bg = "#10b981" if step_idx >= 3 else "#1e293b"
        deliv_border = "#10b981" if step_idx >= 3 else "#475569"
        deliv_text = "#10b981" if step_idx >= 3 else "#64748b"

        html_body = f"""
        <html>
        <body style="background-color: #0b0c16; color: #e2e8f0; font-family: monospace; padding: 24px; text-align: center;">
            <div style="max-width: 520px; margin: 0 auto; background-color: #161726; border: 1px solid {accent_color}; border-radius: 12px; padding: 28px; box-shadow: 0 8px 32px rgba(0,0,0,0.5);">
                <h2 style="color: #ffffff; letter-spacing: 2px; margin-bottom: 4px; font-size: 20px;">FLEETFLOW</h2>
                <p style="color: {accent_color}; font-size: 10px; text-transform: uppercase; margin-top: 0; margin-bottom: 20px; letter-spacing: 1px;">
                    // Real-Time Cargo Manifest Notification
                </p>

                <!-- 4-Stage Visual Delivery Stepper matching exact specification -->
                <div style="background-color: #090a10; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 18px 8px; margin-bottom: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="text-align: center; border-collapse: collapse;">
                        <tr>
                            <!-- 1. Shipment Confirmed -->
                            <td width="20%" style="vertical-align: top;">
                                <div style="width: 38px; height: 38px; line-height: 38px; border-radius: 50%; background-color: #e11d48; color: #ffffff; margin: 0 auto; font-size: 17px; box-shadow: 0 4px 10px rgba(225,29,72,0.4);">
                                    📋
                                </div>
                                <div style="font-size: 10px; font-weight: bold; color: #e11d48; margin-top: 6px; font-family: sans-serif;">Shipment Confirmed</div>
                            </td>
                            <!-- Connector 1-2 -->
                            <td width="6%" style="vertical-align: middle; padding-bottom: 18px;">
                                <div style="height: 3px; background-color: {conn1_color}; border-radius: 2px;"></div>
                            </td>
                            <!-- 2. Trip Scheduled -->
                            <td width="20%" style="vertical-align: top;">
                                <div style="width: 38px; height: 38px; line-height: 38px; border-radius: 50%; background-color: {pack_bg}; border: 2px solid {pack_border}; color: #ffffff; margin: 0 auto; font-size: 17px;">
                                    📦
                                </div>
                                <div style="font-size: 10px; font-weight: bold; color: {pack_text}; margin-top: 6px; font-family: sans-serif;">Trip Scheduled</div>
                            </td>
                            <!-- Connector 2-3 -->
                            <td width="6%" style="vertical-align: middle; padding-bottom: 18px;">
                                <div style="height: 3px; background-color: {conn2_color}; border-radius: 2px;"></div>
                            </td>
                            <!-- 3. In Transit -->
                            <td width="20%" style="vertical-align: top;">
                                <div style="width: 38px; height: 38px; line-height: 38px; border-radius: 50%; background-color: {transit_bg}; border: 2px solid {transit_border}; color: #ffffff; margin: 0 auto; font-size: 17px;">
                                    🚚
                                </div>
                                <div style="font-size: 10px; font-weight: bold; color: {transit_text}; margin-top: 6px; font-family: sans-serif;">In Transit</div>
                            </td>
                            <!-- Connector 3-4 -->
                            <td width="6%" style="vertical-align: middle; padding-bottom: 18px;">
                                <div style="height: 3px; background-color: {conn3_color}; border-radius: 2px;"></div>
                            </td>
                            <!-- 4. Delivered -->
                            <td width="20%" style="vertical-align: top;">
                                <div style="width: 38px; height: 38px; line-height: 38px; border-radius: 50%; background-color: {deliv_bg}; border: 2px solid {deliv_border}; color: #ffffff; margin: 0 auto; font-size: 17px;">
                                    🏠
                                </div>
                                <div style="font-size: 10px; font-weight: bold; color: {deliv_text}; margin-top: 6px; font-family: sans-serif;">Delivered</div>
                            </td>
                        </tr>
                    </table>
                </div>

                <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; text-align: left;">
                    <p style="font-size: 13px; color: #ffffff; margin-bottom: 14px;">Dear <strong>{customer_name}</strong>,</p>
                    <p style="font-size: 12px; color: #cbd5e1; line-height: 1.6; margin-bottom: 16px;">
                        {status_message}
                    </p>
                    <div style="background-color: #090a10; border-left: 3px solid {accent_color}; padding: 14px; border-radius: 6px; margin-bottom: 20px;">
                        <span style="font-size: 10px; color: #718096; text-transform: uppercase; display: block;">Tracking Key:</span>
                        <strong style="font-size: 13px; color: #ffffff; font-family: monospace; display: block; margin-bottom: 8px;">{tracking_number}</strong>
                        
                        <span style="font-size: 10px; color: #718096; text-transform: uppercase; display: block;">Current Status:</span>
                        <strong style="font-size: 13px; color: {accent_color}; font-family: monospace; display: block; margin-bottom: 8px;">{status_label}</strong>

                        <span style="font-size: 10px; color: #718096; text-transform: uppercase; display: block;">Assigned Unit & Driver:</span>
                        <strong style="font-size: 12px; color: #ffffff; font-family: monospace; display: block; margin-bottom: 8px;">{vehicle_display} // {driver_display}</strong>
 
                        <span style="font-size: 10px; color: #718096; text-transform: uppercase; display: block;">Route Manifest:</span>
                        <strong style="font-size: 12px; color: #38bdf8; font-family: monospace; display: block;">{source.upper()} → {destination.upper()}</strong>
                    </div>
                    <p style="font-size: 11px; color: #94a3b8; line-height: 1.6; margin-bottom: 8px;">
                        * You can query real-time vehicle coordinates and live GPS trail directly on the FleetFlow tracking console.
                    </p>
                </div>
                <div style="font-size: 8px; color: #4a5568; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 14px;">
                    CARGO MONITORING MANIFEST // PORT 443 SECURED
                </div>
            </div>
        </body>
        </html>
        """
        
        if not settings.smtp_user or not settings.smtp_password:
            print(f"[FleetFlow SMTP] SMTP credentials not set. Simulating lifecycle email [{status_key.upper()}] to {to_email}.")
            _save_mock_email(to_email, f"Manifest {tracking_number} - {status_key}", html_body, f"{tracking_number}_{status_key}")
            return True

        msg = MIMEMultipart()
        msg['From'] = settings.smtp_user
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(html_body, 'html'))

        if settings.smtp_port == 465:
            server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=5.0)
        else:
            server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=5.0)
            server.starttls()

        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_user, to_email, msg.as_string())
        server.quit()
        
        print(f"[FleetFlow SMTP] Lifecycle email [{status_key.upper()}] successfully sent to {to_email}")
        return True
    except Exception as e:
        print(f"[FleetFlow SMTP] Shipment status notification dispatch failure: {e}")
        return False

def dispatch_customer_lifecycle_email(
    to_email: str | None,
    tracking_number: str,
    customer_name: str,
    status: str,
    source: str,
    destination: str,
    driver_name: str | None = None,
    vehicle_plate: str | None = None,
    checkpoint_city: str | None = None,
    distance_remaining: float | None = None,
    eta_str: str | None = None,
    stage: str | None = None
) -> None:
    if not to_email or "@" not in to_email:
        return
    t = threading.Thread(
        target=send_shipment_status_email,
        kwargs={
            "to_email": to_email,
            "tracking_number": tracking_number,
            "customer_name": customer_name,
            "status": status,
            "source": source,
            "destination": destination,
            "driver_name": driver_name,
            "vehicle_plate": vehicle_plate,
            "checkpoint_city": checkpoint_city,
            "distance_remaining": distance_remaining,
            "eta_str": eta_str,
            "stage": stage
        },
        daemon=True
    )
    t.start()


def send_maintenance_alert_email(
    to_email: str,
    recipient_name: str,
    recipient_role: str,
    vehicle_plate: str,
    vehicle_model: str,
    maintenance_type: str,
    service_date: str,
    remarks: str | None = None,
    alert_type: str = "5_DAYS",
    days_left: int | None = None
) -> bool:
    try:
        colors = {
            "5_DAYS": {"accent": "#f59e0b", "badge": "5-DAY ADVANCE NOTICE", "title": "⚠️ 5-Day Service Reminder", "desc": "This is a proactive 5-day advance reminder for scheduled vehicle servicing."},
            "1_DAY": {"accent": "#ef4444", "badge": "URGENT: 24 HOURS REMAINING", "title": "🚨 Urgent: Vehicle Service Tomorrow", "desc": "Urgent service notice: this vehicle is scheduled for maintenance tomorrow."},
            "SCHEDULED": {"accent": "#00f0ff", "badge": "SERVICE SCHEDULED", "title": "🔧 Vehicle Maintenance Scheduled", "desc": "A vehicle maintenance appointment has been scheduled and recorded in the fleet registry."},
            "DUE_TODAY": {"accent": "#38bdf8", "badge": "SERVICE DUE TODAY", "title": "🔔 Vehicle Service Scheduled for Today", "desc": "Today is the scheduled service date for this vehicle. Please coordinate workshop delivery."},
            "RESOLVED": {"accent": "#10b981", "badge": "SERVICE COMPLETED", "title": "✅ Vehicle Service Completed & Cleared", "desc": "Vehicle maintenance has been completed. The vehicle has been inspected and returned to Available status."},
            "DUE_HOURLY": {"accent": "#dc2626", "badge": "OVERDUE / MISSED DEADLINE", "title": "🔥 Critical: Service Overdue", "desc": "Critical alert: Scheduled maintenance for this vehicle is past due and requires immediate attention."}
        }
        cfg = colors.get(alert_type, colors["5_DAYS"])
        accent_color = cfg["accent"]
        badge_text = cfg["badge"]
        subject_title = cfg["title"]
        intro_desc = cfg.get("desc", "A vehicle maintenance update has been dispatched for management review.")

        html_body = f"""
        <html>
        <body style="background-color: #06070d; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; padding: 24px; margin: 0;">
            <div style="max-width: 540px; margin: 0 auto; background-color: #0e1122; border: 1px solid {accent_color}; border-radius: 16px; padding: 32px; box-shadow: 0 16px 48px rgba(0,0,0,0.7);">
                
                <!-- Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 16px; margin-bottom: 24px;">
                    <div>
                        <h2 style="color: #ffffff; letter-spacing: 2px; margin: 0; font-size: 20px; font-weight: 900;">FLEETFLOW</h2>
                        <p style="color: {accent_color}; font-size: 10px; text-transform: uppercase; margin: 4px 0 0 0; letter-spacing: 1px;">
                            // FLEET MANAGEMENT ALERT
                        </p>
                    </div>
                    <div style="background-color: rgba(255,255,255,0.06); border: 1px solid {accent_color}; color: {accent_color}; font-size: 10px; font-weight: bold; padding: 6px 12px; border-radius: 20px; text-transform: uppercase;">
                        {badge_text}
                    </div>
                </div>

                <!-- Greeting & Notice -->
                <p style="font-size: 13px; color: #ffffff; margin-bottom: 8px;">
                    Attention <strong>{recipient_name}</strong> ({recipient_role}),
                </p>
                <p style="font-size: 12px; color: #94a3b8; line-height: 1.6; margin-bottom: 20px;">
                    {intro_desc}
                </p>

                <!-- Vehicle Details Box -->
                <div style="background-color: #06070d; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <tr>
                            <td style="color: #64748b; padding: 6px 0; width: 40%;">VEHICLE REGISTRATION:</td>
                            <td style="color: #00f0ff; font-weight: bold; padding: 6px 0;">{vehicle_plate}</td>
                        </tr>
                        <tr>
                            <td style="color: #64748b; padding: 6px 0;">VEHICLE MODEL:</td>
                            <td style="color: #ffffff; font-weight: 600; padding: 6px 0;">{vehicle_model}</td>
                        </tr>
                        <tr>
                            <td style="color: #64748b; padding: 6px 0;">SERVICE TYPE:</td>
                            <td style="color: #ffffff; font-weight: 600; padding: 6px 0;">{maintenance_type}</td>
                        </tr>
                        <tr>
                            <td style="color: #64748b; padding: 6px 0;">SERVICE DATE:</td>
                            <td style="color: {accent_color}; font-weight: bold; padding: 6px 0;">{service_date}</td>
                        </tr>
                        {f'<tr><td style="color: #64748b; padding: 6px 0;">REMARKS:</td><td style="color: #cbd5e1; padding: 6px 0;">{remarks}</td></tr>' if remarks else ''}
                    </table>
                </div>

                <!-- Call to Action -->
                <div style="text-align: center; margin-bottom: 24px;">
                    <a href="http://localhost:5173/dashboard" style="display: inline-block; background-color: {accent_color}; color: #06070d; font-weight: bold; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 12px; letter-spacing: 0.5px;">
                        OPEN FLEETFLOW DASHBOARD →
                    </a>
                </div>

                <!-- Footer -->
                <div style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px; font-size: 9px; color: #475569; text-align: center;">
                    AUTOMATED FLEET MANAGEMENT DISPATCH // CELERY BEAT NOTIFICATION NODE
                </div>
            </div>
        </body>
        </html>
        """

        if not settings.smtp_user or not settings.smtp_password:
            print(f"[FleetFlow SMTP] Mocking management email [{alert_type}] to {to_email}")
            _save_mock_email(to_email, f"Management Alert: {vehicle_plate}", html_body, f"maint_{alert_type.lower()}_{vehicle_plate}")
            return True

        msg = MIMEMultipart()
        msg['From'] = settings.smtp_user
        msg['To'] = to_email
        msg['Subject'] = f"FleetFlow [{subject_title}]: {vehicle_plate}"
        msg.attach(MIMEText(html_body, 'html'))

        if settings.smtp_port == 465:
            server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=5.0)
        else:
            server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=5.0)
            server.starttls()

        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_user, to_email, msg.as_string())
        server.quit()
        print(f"[FleetFlow SMTP] Dispatched management email [{alert_type}] to {to_email}")
        return True
    except Exception as e:
        print(f"[FleetFlow SMTP] Failed to send maintenance email to {to_email}: {e}")
        return False


def notify_maintenance_stakeholders(
    db, 
    maintenance_record, 
    alert_type: str = "SCHEDULED", 
    days_left: int | None = None,
    send_email: bool | None = None,
    send_web: bool | None = None
) -> int:
    import json
    from app.models.user import User, RoleEnum
    from app.models.vehicle import Vehicle
    from app.models.driver import Driver

    # =========================================================================
    # EXACT MAINTENANCE POLICY RULES:
    # 1. Scheduled: NO notification (neither mail nor web app)
    # 2. 5 Days Before: Notification for mail AND web app
    # 3. 1 Day Before: Notification for mail AND web app
    # 4. Service Day: Notification for mail AND web app
    # 5. Overdue: Exactly ONE mail for the whole day (24h), web app hourly
    # 6. Finish (Resolved): NO mail, ONLY notification for web app
    # =========================================================================

    if send_email is None:
        send_email = alert_type in ["5_DAYS", "1_DAY", "DUE_TODAY", "DUE_DAILY_MAIL", "OVERDUE_EMAIL"]

    if send_web is None:
        send_web = alert_type in ["5_DAYS", "1_DAY", "DUE_TODAY", "DUE_HOURLY", "OVERDUE", "RESOLVED"]

    if alert_type == "SCHEDULED":
        send_email = False
        send_web = False

    if not send_email and not send_web:
        print(f"[Maintenance Notification] Alert [{alert_type}] skipped (policy: no mail and no web).")
        return 0

    # 1. Gather vehicle info
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == maintenance_record.vehicle_id).first()
    plate = vehicle.registration_number if vehicle else "UNKNOWN-VEHICLE"
    model = f"{vehicle.brand or ''} {vehicle.model or ''}".strip() if vehicle else "Fleet Vehicle"

    service_date_str = str(maintenance_record.service_date or maintenance_record.next_service_date or "Scheduled")
    remarks_str = maintenance_record.remarks or ""

    recipients_count = 0

    # 2. Email Delivery
    if send_email:
        target_users = db.query(User).filter(
            User.role.in_([RoleEnum.Admin, RoleEnum.FleetManager, RoleEnum.Dispatcher])
        ).all()

        recipients = {u.email: (u.full_name, u.role.value) for u in target_users if u.email}

        if vehicle and vehicle.assigned_driver:
            driver = db.query(Driver).filter(Driver.driver_id == vehicle.assigned_driver).first()
            if driver and driver.user and driver.user.email:
                recipients[driver.user.email] = (driver.user.full_name, "Assigned Driver")

        recipients_count = len(recipients)
        for email, (name, role_name) in recipients.items():
            threading.Thread(
                target=send_maintenance_alert_email,
                kwargs={
                    "to_email": email,
                    "recipient_name": name,
                    "recipient_role": role_name,
                    "vehicle_plate": plate,
                    "vehicle_model": model,
                    "maintenance_type": maintenance_record.maintenance_type,
                    "service_date": service_date_str,
                    "remarks": remarks_str,
                    "alert_type": alert_type,
                    "days_left": days_left
                },
                daemon=True
            ).start()
        print(f"[Maintenance Email] Dispatched [{alert_type}] alert email to {recipients_count} recipient(s).")

    # 3. Web Application Notification (WebSocket Real-Time Broadcast & DB Notification)
    if send_web:
        titles = {
            "5_DAYS": "⚠️ 5-DAY SERVICE REMINDER",
            "1_DAY": "🚨 SERVICE DUE TOMORROW",
            "DUE_TODAY": "🔔 SERVICE DUE TODAY",
            "DUE_HOURLY": "🔥 OVERDUE MAINTENANCE ALERT",
            "OVERDUE": "🔥 OVERDUE MAINTENANCE ALERT",
            "RESOLVED": "✅ SERVICE COMPLETED & RESOLVED"
        }
        msg_title = titles.get(alert_type, "🔧 MAINTENANCE ALERT")
        
        if alert_type == "RESOLVED":
            ws_msg = f"Vehicle {plate} ({model}): {maintenance_record.maintenance_type} has been completed and resolved. Status set to Available."
        elif "OVERDUE" in alert_type or alert_type == "DUE_HOURLY":
            overdue_days_str = f" ({abs(days_left)} days overdue)" if days_left is not None else " (Overdue)"
            ws_msg = f"CRITICAL: Vehicle {plate} ({model}): {maintenance_record.maintenance_type} is past due{overdue_days_str}. Immediate inspection required."
        else:
            ws_msg = f"Vehicle {plate} ({model}): {maintenance_record.maintenance_type} scheduled for {service_date_str}."

        try:
            from app.routers.notifications import create_and_broadcast_notification
            notif_type = "warning" if alert_type in ["5_DAYS", "1_DAY"] else ("error" if "OVERDUE" in alert_type or alert_type == "DUE_HOURLY" else ("success" if alert_type == "RESOLVED" else "info"))
            
            # 1. Fleet Manager & Admin push notification
            create_and_broadcast_notification(
                db=db,
                title=msg_title,
                message=ws_msg,
                type=notif_type,
                target_role="FleetManager",
                broadcast_ws=True
            )

            # 2. Dispatcher push notification
            create_and_broadcast_notification(
                db=db,
                title=msg_title,
                message=ws_msg,
                type=notif_type,
                target_role="Dispatcher",
                broadcast_ws=True
            )

            # 3. Vehicle Assigned Driver push notification
            if vehicle and vehicle.assigned_driver:
                assigned_driver = db.query(Driver).filter(Driver.driver_id == vehicle.assigned_driver).first()
                if assigned_driver and assigned_driver.user:
                    driver_ws_msg = f"Vehicle Alert ({plate}): {maintenance_record.maintenance_type} - {ws_msg}"
                    create_and_broadcast_notification(
                        db=db,
                        title=f"🔧 VEHICLE ALERT: {msg_title}",
                        message=driver_ws_msg,
                        type=notif_type,
                        user_id=assigned_driver.user.user_id,
                        target_role="Driver",
                        broadcast_ws=True
                    )
                    print(f"[Maintenance Web Notification] Pushed alert to assigned driver {assigned_driver.user.full_name} for vehicle {plate}.")

            print(f"[Maintenance Web Notification] Logged & broadcasted [{alert_type}] notification for Fleet Managers, Dispatchers, and Assigned Driver.")
        except Exception as e:
            print(f"[Maintenance Notification] Error broadcasting notification: {e}")

    return recipients_count
