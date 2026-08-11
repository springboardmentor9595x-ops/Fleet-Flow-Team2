import smtplib
import socket
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

def send_otp_email(to_email: str, otp: str) -> bool:
    if not settings.smtp_user or not settings.smtp_password:
        print("[FleetFlow SMTP] SMTP_USER or SMTP_PASSWORD environment variables not set. Skipping real mail dispatch.")
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = settings.smtp_user
        msg['To'] = to_email
        msg['Subject'] = "FleetFlow Security Activation Code"

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
        
        msg.attach(MIMEText(html_body, 'html'))

        # Connect with 5-second socket timeout to prevent API hangs
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
    if not settings.smtp_user or not settings.smtp_password:
        print("[FleetFlow SMTP] SMTP_USER or SMTP_PASSWORD environment variables not set. Skipping welcome mail dispatch.")
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = settings.smtp_user
        msg['To'] = to_email
        msg['Subject'] = "Welcome to FleetFlow Logistics Hub!"

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
    if not settings.smtp_user or not settings.smtp_password:
        print("[FleetFlow SMTP] SMTP_USER or SMTP_PASSWORD environment variables not set. Skipping password change email dispatch.")
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = settings.smtp_user
        msg['To'] = to_email
        msg['Subject'] = "FleetFlow Security Alert: Password Updated"

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


def send_shipment_status_email(to_email: str, tracking_number: str, customer_name: str, status: str, source: str, destination: str) -> bool:
    if not settings.smtp_user or not settings.smtp_password:
        print(f"[FleetFlow SMTP] SMTP_USER or SMTP_PASSWORD not set. Skipping shipment update email to {to_email}.")
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = settings.smtp_user
        msg['To'] = to_email
        
        # Format Subject based on status
        subject_status = status.upper()
        msg['Subject'] = f"FleetFlow Shipment Alert: Manifest {tracking_number} is now {subject_status}"

        # Distinct color scheme per status
        accent_color = "#00f0ff" # cyan
        status_label = "IN TRANSIT"
        if status.lower() == "completed" or status.lower() == "delivered":
            accent_color = "#39ff14" # green
            status_label = "DELIVERED"
        elif status.lower() == "departure" or status.lower() == "departed":
            accent_color = "#ff007f" # pink/magenta
            status_label = "DEPARTED"

        html_body = f"""
        <html>
        <body style="background-color: #0b0c16; color: #e2e8f0; font-family: monospace; padding: 24px; text-align: center;">
            <div style="max-width: 480px; margin: 0 auto; background-color: #161726; border: 1px solid {accent_color}; border-radius: 12px; padding: 32px; box-shadow: 0 8px 32px rgba(0,0,0,0.5);">
                <h2 style="color: #ffffff; letter-spacing: 2px; margin-bottom: 4px;">FLEETFLOW</h2>
                <p style="color: {accent_color}; font-size: 10px; text-transform: uppercase; margin-top: 0; margin-bottom: 24px; letter-spacing: 1px;">
                    // Real-Time Cargo Manifest Update
                </p>
                <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px; margin-bottom: 24px; text-align: left;">
                    <p style="font-size: 14px; color: #ffffff; margin-bottom: 16px;">Dear <strong>{customer_name}</strong>,</p>
                    <p style="font-size: 12px; color: #a0aec0; line-height: 1.6; margin-bottom: 16px;">
                        This email confirms that your shipment tracking manifest has received a status update.
                    </p>
                    <div style="background-color: #090a10; border-left: 3px solid {accent_color}; padding: 12px; border-radius: 4px; margin-bottom: 20px;">
                        <span style="font-size: 10px; color: #718096; text-transform: uppercase; display: block;">Tracking Key:</span>
                        <strong style="font-size: 13px; color: #ffffff; font-family: monospace; display: block; margin-bottom: 8px;">{tracking_number}</strong>
                        
                        <span style="font-size: 10px; color: #718096; text-transform: uppercase; display: block;">Current Status:</span>
                        <strong style="font-size: 14px; color: {accent_color}; font-family: monospace; display: block; margin-bottom: 8px;">{status_label}</strong>

                        <span style="font-size: 10px; color: #718096; text-transform: uppercase; display: block;">Route Manifest:</span>
                        <strong style="font-size: 12px; color: #ffffff; font-family: monospace; display: block;">{source.upper()} → {destination.upper()}</strong>
                    </div>
                    <p style="font-size: 11px; color: #a0aec0; line-height: 1.6; margin-bottom: 8px;">
                        * You can query real-time vehicle coordinates and ETA directly using the FleetFlow tracking console.
                    </p>
                </div>
                <div style="font-size: 8px; color: #4a5568; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px;">
                    CARGO MONITORING MANIFEST // PORT 443 SECURED
                </div>
            </div>
        </body>
        </html>
        """

        msg.attach(MIMEText(html_body, 'html'))

        if settings.smtp_port == 465:
            server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=5.0)
        else:
            server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=5.0)
            server.starttls()

        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_user, to_email, msg.as_string())
        server.quit()

        print(f"[FleetFlow SMTP] Shipment update email successfully sent to {to_email} with status {status}")
        return True
    except Exception as e:
        print(f"[FleetFlow SMTP] Shipment status notification dispatch failure: {e}")
        return False
