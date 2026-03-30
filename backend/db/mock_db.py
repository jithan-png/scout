"""
In-memory mock database.
Replace with real Supabase client when ready (see db/client.py).
All collections are plain lists/dicts — no ORM needed for MVP.
"""
from datetime import date
from typing import List, Dict, Any, Optional

_projects: List[Dict[str, Any]] = [
    {"id": "proj-001", "user_id": "", "permit_number": "PHX-2025-0142", "address": "1420 W Camelback Rd", "city": "Phoenix", "state": "AZ", "country": "USA", "county": "Maricopa", "zip": "85015", "region": "Central Phoenix", "lat": 33.5094, "lng": -112.0949, "project_class": "Commercial", "permit_type": "New Construction", "description": "4-story mixed-use retail and residential building with concrete foundation and steel framing", "value": 2400000, "tags": [], "contractor_name": "Axiom Builders", "builder_name": "John Smith", "contractor_phone": "602-555-0142", "contractor_email": "john@axiombuilders.com", "applicant_company": "Desert Development LLC", "applicant_name": "Sarah Chen", "applicant_phone": "602-555-0198", "applicant_email": "schen@desertdev.com", "owner_company": "Camelback Partners LLC", "owner_name": "Robert Martinez", "owner_phone": "602-555-0211", "owner_email": "rmartinez@camelbackpartners.com", "additional_info": "ADA compliant, LEED certified target", "status": "Active", "issued_date": "2025-04-02", "source": "upload", "import_batch_id": "batch-demo-001", "data_freshness": "fresh"},
    {"id": "proj-002", "user_id": "", "permit_number": "PHX-2025-0301", "address": "340 N Central Ave", "city": "Phoenix", "state": "AZ", "country": "USA", "county": "Maricopa", "zip": "85004", "region": "Downtown Phoenix", "lat": 33.4484, "lng": -112.0740, "project_class": "Commercial", "permit_type": "Tenant Improvement", "description": "Office suite renovation on floors 12-14, new mechanical systems and interior buildout", "value": 480000, "tags": [], "contractor_name": "Mesa Construction Co", "builder_name": "David Lee", "contractor_phone": "602-555-0301", "contractor_email": "dlee@mesaconstruction.com", "applicant_company": "Central Office Partners", "applicant_name": "Jennifer Wu", "applicant_phone": "602-555-0312", "applicant_email": "jwu@centraloffice.com", "owner_company": None, "owner_name": "Thomas Brown", "owner_phone": "602-555-0402", "owner_email": None, "additional_info": None, "status": "Pending", "issued_date": "2025-03-15", "source": "upload", "import_batch_id": "batch-demo-001", "data_freshness": "fresh"},
    {"id": "proj-003", "user_id": "", "permit_number": "PHX-2025-0201", "address": "88 E Van Buren St", "city": "Phoenix", "state": "AZ", "country": "USA", "county": "Maricopa", "zip": "85004", "region": "Downtown Phoenix", "lat": 33.4488, "lng": -112.0540, "project_class": "Industrial", "permit_type": "Warehouse", "description": "Tilt-up concrete warehouse expansion, 18,000 sq ft addition with loading docks", "value": 1100000, "tags": [], "contractor_name": "Southwest Industrial Builders", "builder_name": None, "contractor_phone": "480-555-0201", "contractor_email": None, "applicant_company": "Phoenix Industrial LLC", "applicant_name": "Mark Thompson", "applicant_phone": "480-555-0215", "applicant_email": "mthompson@phxindustrial.com", "owner_company": "Phoenix Industrial LLC", "owner_name": "Mark Thompson", "owner_phone": "480-555-0215", "owner_email": "mthompson@phxindustrial.com", "additional_info": "Fire suppression upgrade included", "status": "Active", "issued_date": "2025-02-20", "source": "upload", "import_batch_id": "batch-demo-001", "data_freshness": "fresh"},
    {"id": "proj-004", "user_id": "", "permit_number": "SCO-2025-0440", "address": "7014 E Camelback Rd", "city": "Scottsdale", "state": "AZ", "country": "USA", "county": "Maricopa", "zip": "85251", "region": "Central Scottsdale", "lat": 33.4942, "lng": -111.9261, "project_class": "Commercial", "permit_type": "Retail Build-Out", "description": "High-end retail space buildout with custom millwork, storefront glazing, and luxury finishes", "value": 320000, "tags": [], "contractor_name": "Prestige Build Group", "builder_name": "Emily Nguyen", "contractor_phone": "480-555-0440", "contractor_email": "emily@prestigebuild.com", "applicant_company": "Scottsdale Retail Partners", "applicant_name": "Chris Ford", "applicant_phone": "480-555-0455", "applicant_email": "cford@scottsdaleretail.com", "owner_company": "Camelback Plaza LLC", "owner_name": "", "owner_phone": None, "owner_email": None, "additional_info": None, "status": "Active", "issued_date": "2025-04-10", "source": "upload", "import_batch_id": "batch-demo-001", "data_freshness": "fresh"},
    {"id": "proj-005", "user_id": "", "permit_number": "TMP-2025-0550", "address": "120 S Mill Ave", "city": "Tempe", "state": "AZ", "country": "USA", "county": "Maricopa", "zip": "85281", "region": "Downtown Tempe", "lat": 33.4255, "lng": -111.9400, "project_class": "Residential", "permit_type": "Multi-Family", "description": "6-story luxury apartment complex, 84 units with underground parking and rooftop amenities", "value": 8700000, "tags": [], "contractor_name": "Valley Residential Group", "builder_name": "Laura Kim", "contractor_phone": "480-555-0550", "contractor_email": "lkim@valleyresidential.com", "applicant_company": "Tempe Urban Living LLC", "applicant_name": "Ryan Patel", "applicant_phone": "480-555-0565", "applicant_email": "rpatel@tempeurbanliving.com", "owner_company": "Tempe Urban Living LLC", "owner_name": "Ryan Patel", "owner_phone": "480-555-0565", "owner_email": "rpatel@tempeurbanliving.com", "additional_info": "Near ASU campus, EV charging in garage", "status": "Active", "issued_date": "2025-01-28", "source": "upload", "import_batch_id": "batch-demo-001", "data_freshness": "fresh"},
    {"id": "proj-006", "user_id": "", "permit_number": "MSA-2025-0601", "address": "45 W Main St", "city": "Mesa", "state": "AZ", "country": "USA", "county": "Maricopa", "zip": "85201", "region": "Downtown Mesa", "lat": 33.4152, "lng": -111.8315, "project_class": "Commercial", "permit_type": "Restaurant", "description": "Full-service restaurant conversion from retail, commercial kitchen installation and dining room renovation", "value": 195000, "tags": [], "contractor_name": "", "builder_name": None, "contractor_phone": None, "contractor_email": None, "applicant_company": "Mesa Dining Partners", "applicant_name": "Angela Rodriguez", "applicant_phone": "480-555-0601", "applicant_email": "arodriguez@mesadining.com", "owner_company": None, "owner_name": "Angela Rodriguez", "owner_phone": "480-555-0601", "owner_email": "arodriguez@mesadining.com", "additional_info": None, "status": "Pending", "issued_date": "2025-03-30", "source": "upload", "import_batch_id": "batch-demo-001", "data_freshness": "fresh"},
    {"id": "proj-007", "user_id": "", "permit_number": "CHA-2025-0701", "address": "2250 S Dobson Rd", "city": "Chandler", "state": "AZ", "country": "USA", "county": "Maricopa", "zip": "85286", "region": "South Chandler", "lat": 33.3062, "lng": -111.8413, "project_class": "Industrial", "permit_type": "Distribution Center", "description": "New 45,000 sq ft distribution center with cross-dock loading, refrigerated storage section, office mezzanine", "value": 4200000, "tags": [], "contractor_name": "Chandler Industrial Group", "builder_name": "Kevin Walsh", "contractor_phone": "480-555-0701", "contractor_email": "kwalsh@chandlerindustrial.com", "applicant_company": "Southwest Logistics LLC", "applicant_name": "Patricia Okafor", "applicant_phone": "480-555-0715", "applicant_email": "pokafor@swlogistics.com", "owner_company": "Dobson Commerce Park LLC", "owner_name": "", "owner_phone": None, "owner_email": None, "additional_info": "ESFR sprinkler system, 32ft clear height", "status": "Active", "issued_date": "2025-02-14", "source": "upload", "import_batch_id": "batch-demo-001", "data_freshness": "fresh"},
    {"id": "proj-008", "user_id": "", "permit_number": "GLD-2025-0801", "address": "5800 N 67th Ave", "city": "Glendale", "state": "AZ", "country": "USA", "county": "Maricopa", "zip": "85301", "region": "North Glendale", "lat": 33.5387, "lng": -112.1860, "project_class": "Residential", "permit_type": "Single Family", "description": "Custom single-family home, 4,200 sq ft, wood frame construction with stucco exterior and tile roof", "value": 680000, "tags": [], "contractor_name": "Sonoran Custom Homes", "builder_name": "Brad Foster", "contractor_phone": "623-555-0801", "contractor_email": "brad@sonorancustom.com", "applicant_company": None, "applicant_name": "Steven Garcia", "applicant_phone": "623-555-0810", "applicant_email": "sgarcia@email.com", "owner_company": None, "owner_name": "Steven Garcia", "owner_phone": "623-555-0810", "owner_email": "sgarcia@email.com", "additional_info": "Pool permit separate", "status": "Active", "issued_date": "2025-04-05", "source": "upload", "import_batch_id": "batch-demo-001", "data_freshness": "fresh"},
    {"id": "proj-009", "user_id": "", "permit_number": "PEO-2025-0901", "address": "10200 N 83rd Ave", "city": "Peoria", "state": "AZ", "country": "USA", "county": "Maricopa", "zip": "85345", "region": "North Peoria", "lat": 33.5806, "lng": -112.2374, "project_class": "Commercial", "permit_type": "Medical Office", "description": "Medical office building, 12,000 sq ft, dental and urgent care tenant mix, ADA compliant design", "value": 1750000, "tags": [], "contractor_name": "Healthcare Construction Services", "builder_name": "Diana Yee", "contractor_phone": "623-555-0901", "contractor_email": "dyee@hcsconstruction.com", "applicant_company": "Peoria Medical Group", "applicant_name": "Dr. James Lin", "applicant_phone": "623-555-0912", "applicant_email": "jlin@peoriamed.com", "owner_company": "Peoria Medical Group", "owner_name": "Dr. James Lin", "owner_phone": "623-555-0912", "owner_email": "jlin@peoriamed.com", "additional_info": "Medical gas systems, lead-lined rooms", "status": "Pending", "issued_date": "2025-03-22", "source": "upload", "import_batch_id": "batch-demo-001", "data_freshness": "fresh"},
    {"id": "proj-010", "user_id": "", "permit_number": "GIL-2025-1001", "address": "1890 N Higley Rd", "city": "Gilbert", "state": "AZ", "country": "USA", "county": "Maricopa", "zip": "85234", "region": "North Gilbert", "lat": 33.3528, "lng": -111.7890, "project_class": "Residential", "permit_type": "Multi-Family", "description": "Townhome development, 24 units, 3-story wood frame, attached garages, community pool", "value": 3600000, "tags": [], "contractor_name": "Gilbert Premier Homes", "builder_name": "Michelle Tran", "contractor_phone": "480-555-1001", "contractor_email": "mtran@gilbertpremier.com", "applicant_company": "East Valley Housing LLC", "applicant_name": "Craig Bishop", "applicant_phone": "480-555-1015", "applicant_email": "cbishop@evhousing.com", "owner_company": "East Valley Housing LLC", "owner_name": "Craig Bishop", "owner_phone": "480-555-1015", "owner_email": "cbishop@evhousing.com", "additional_info": "Photovoltaic solar on all units", "status": "Active", "issued_date": "2025-03-08", "source": "upload", "import_batch_id": "batch-demo-001", "data_freshness": "fresh"},
    {"id": "proj-011", "user_id": "", "permit_number": "SCO-2025-1101", "address": "8900 N Hayden Rd", "city": "Scottsdale", "state": "AZ", "country": "USA", "county": "Maricopa", "zip": "85258", "region": "North Scottsdale", "lat": 33.5450, "lng": -111.9261, "project_class": "Commercial", "permit_type": "Hotel", "description": "Boutique hotel renovation, 48 rooms, new lobby, rooftop bar, fitness center upgrade", "value": 2900000, "tags": [], "contractor_name": "Luxury Build Associates", "builder_name": "Andrew Park", "contractor_phone": "480-555-1101", "contractor_email": "apark@luxurybuild.com", "applicant_company": "Scottsdale Hospitality Group", "applicant_name": "Vanessa Clark", "applicant_phone": "480-555-1115", "applicant_email": "vclark@scottsdalehosp.com", "owner_company": "Scottsdale Hospitality Group", "owner_name": "Vanessa Clark", "owner_phone": "480-555-1115", "owner_email": "vclark@scottsdalehosp.com", "additional_info": None, "status": "Active", "issued_date": "2025-02-01", "source": "upload", "import_batch_id": "batch-demo-001", "data_freshness": "fresh"},
    {"id": "proj-012", "user_id": "", "permit_number": "PHX-2024-1201", "address": "2400 W Thunderbird Rd", "city": "Phoenix", "state": "AZ", "country": "USA", "county": "Maricopa", "zip": "85023", "region": "North Phoenix", "lat": 33.6118, "lng": -112.0949, "project_class": "Commercial", "permit_type": "Self-Storage", "description": "3-story climate-controlled self-storage facility, 650 units, drive-up access, 24-hour security", "value": 2100000, "tags": [], "contractor_name": "Storage Solutions Builders", "builder_name": "Gary Nelson", "contractor_phone": "602-555-1201", "contractor_email": "gnelson@storagesolutions.com", "applicant_company": None, "applicant_name": "Gary Nelson", "applicant_phone": "602-555-1201", "applicant_email": "gnelson@storagesolutions.com", "owner_company": "Phoenix Storage Investments", "owner_name": "", "owner_phone": None, "owner_email": None, "additional_info": "Permit expired — refiling pending", "status": "Expired", "issued_date": "2024-11-15", "source": "upload", "import_batch_id": "batch-demo-001", "data_freshness": "fresh"},
    {"id": "proj-013", "user_id": "", "permit_number": "MSA-2025-1301", "address": "1500 E Baseline Rd", "city": "Mesa", "state": "AZ", "country": "USA", "county": "Maricopa", "zip": "85204", "region": "South Mesa", "lat": 33.3760, "lng": -111.8315, "project_class": "Educational", "permit_type": "School Addition", "description": "Elementary school gymnasium and cafeteria addition, 8,400 sq ft, pre-engineered metal building", "value": 1400000, "tags": [], "contractor_name": "Education Facility Builders", "builder_name": "Tamara West", "contractor_phone": "480-555-1301", "contractor_email": "twest@edfacilitybuilders.com", "applicant_company": "Mesa Unified School District", "applicant_name": "Frank Ortega", "applicant_phone": "480-555-1315", "applicant_email": "fortega@mesausd.org", "owner_company": "Mesa Unified School District", "owner_name": "Frank Ortega", "owner_phone": "480-555-1315", "owner_email": "fortega@mesausd.org", "additional_info": "Prevailing wage project", "status": "Active", "issued_date": "2025-04-01", "source": "upload", "import_batch_id": "batch-demo-001", "data_freshness": "fresh"},
    {"id": "proj-014", "user_id": "", "permit_number": "PHX-2025-1401", "address": "4200 N 32nd St", "city": "Phoenix", "state": "AZ", "country": "USA", "county": "Maricopa", "zip": "85018", "region": "Central Phoenix", "lat": 33.5000, "lng": -112.0000, "project_class": "Residential", "permit_type": "Addition", "description": "Second story addition, 1,200 sq ft, new master suite and home office above existing garage", "value": 145000, "tags": [], "contractor_name": "", "builder_name": "Owner-Builder", "contractor_phone": "602-555-1401", "contractor_email": None, "applicant_company": None, "applicant_name": "James O'Brien", "applicant_phone": "602-555-1401", "applicant_email": "jobrien@email.com", "owner_company": None, "owner_name": "James O'Brien", "owner_phone": "602-555-1401", "owner_email": "jobrien@email.com", "additional_info": None, "status": "Active", "issued_date": "2025-04-08", "source": "upload", "import_batch_id": "batch-demo-001", "data_freshness": "fresh"},
    {"id": "proj-015", "user_id": "", "permit_number": "SCO-2025-1501", "address": "6200 E Indian School Rd", "city": "Scottsdale", "state": "AZ", "country": "USA", "county": "Maricopa", "zip": "85251", "region": "Central Scottsdale", "lat": 33.4972, "lng": -111.9000, "project_class": "Commercial", "permit_type": "Fitness Center", "description": "New fitness center, 18,000 sq ft, group fitness studios, weight room, spin room, locker facilities", "value": 1850000, "tags": [], "contractor_name": "Phoenix Commercial Group", "builder_name": "Nicole Burns", "contractor_phone": "480-555-1501", "contractor_email": "nburns@phxcommercial.com", "applicant_company": "Fit Life Scottsdale LLC", "applicant_name": "Bryan Castillo", "applicant_phone": "480-555-1515", "applicant_email": "bcastillo@fitlifescottsdale.com", "owner_company": None, "owner_name": "", "owner_phone": None, "owner_email": None, "additional_info": "Acoustic flooring required", "status": "Pending", "issued_date": "2025-03-18", "source": "upload", "import_batch_id": "batch-demo-001", "data_freshness": "fresh"},
    {"id": "proj-016", "user_id": "", "permit_number": "TMP-2025-1601", "address": "3800 S Rural Rd", "city": "Tempe", "state": "AZ", "country": "USA", "county": "Maricopa", "zip": "85282", "region": "South Tempe", "lat": 33.3897, "lng": -111.9264, "project_class": "Commercial", "permit_type": "Car Dealership", "description": "Automotive dealership showroom expansion, 6,000 sq ft addition, glass curtain wall facade", "value": 890000, "tags": [], "contractor_name": "Valley Commercial Builders", "builder_name": "Tony Ramirez", "contractor_phone": "480-555-1601", "contractor_email": "tramirez@valleycommercial.com", "applicant_company": "Arizona Auto Group", "applicant_name": "Sandra Hayes", "applicant_phone": "480-555-1615", "applicant_email": "shayes@azautogroup.com", "owner_company": "Arizona Auto Group", "owner_name": "Sandra Hayes", "owner_phone": "480-555-1615", "owner_email": "shayes@azautogroup.com", "additional_info": None, "status": "Active", "issued_date": "2025-03-05", "source": "upload", "import_batch_id": "batch-demo-001", "data_freshness": "fresh"},
    {"id": "proj-017", "user_id": "", "permit_number": "PHX-2025-1701", "address": "7300 W Greenway Rd", "city": "Phoenix", "state": "AZ", "country": "USA", "county": "Maricopa", "zip": "85053", "region": "Northwest Phoenix", "lat": 33.6289, "lng": -112.1400, "project_class": "Residential", "permit_type": "New Construction", "description": "Production homebuilder subdivision, 42 single-family homes, wood frame, 1,800-2,400 sq ft plans", "value": 12400000, "tags": [], "contractor_name": "Meritage Homes", "builder_name": "Kevin Park", "contractor_phone": "602-555-1701", "contractor_email": "kpark@meritage.com", "applicant_company": "Meritage Homes Corp", "applicant_name": "Kevin Park", "applicant_phone": "602-555-1701", "applicant_email": "kpark@meritage.com", "owner_company": "Northwest Phoenix Development LLC", "owner_name": "", "owner_phone": None, "owner_email": None, "additional_info": "Phased construction over 18 months", "status": "Active", "issued_date": "2025-01-10", "source": "upload", "import_batch_id": "batch-demo-001", "data_freshness": "fresh"},
    {"id": "proj-018", "user_id": "", "permit_number": "GDY-2025-1801", "address": "1600 N Litchfield Rd", "city": "Goodyear", "state": "AZ", "country": "USA", "county": "Maricopa", "zip": "85395", "region": "West Valley", "lat": 33.4350, "lng": -112.3580, "project_class": "Industrial", "permit_type": "Manufacturing", "description": "EV battery manufacturing facility, 120,000 sq ft, tilt-up construction, heavy power infrastructure", "value": 28000000, "tags": [], "contractor_name": "National Industrial Contractors", "builder_name": "Robert Chen", "contractor_phone": "623-555-1801", "contractor_email": "rchen@nationalindustrial.com", "applicant_company": "NextGen Energy Systems", "applicant_name": "Lisa Park", "applicant_phone": "623-555-1815", "applicant_email": "lpark@nexgenenergy.com", "owner_company": "NextGen Energy Systems", "owner_name": "Lisa Park", "owner_phone": "623-555-1815", "owner_email": "lpark@nexgenenergy.com", "additional_info": "DOE funding, prevailing wage", "status": "Active", "issued_date": "2025-02-28", "source": "upload", "import_batch_id": "batch-demo-001", "data_freshness": "fresh"},
]
_agents: List[Dict[str, Any]] = []
_leads: List[Dict[str, Any]] = []
_emails: List[Dict[str, Any]] = []
_import_batches: List[Dict[str, Any]] = []
_user_profiles: Dict[str, Dict[str, Any]] = {}  # keyed by user_id
_discovery_jobs: List[Dict[str, Any]] = []
_notifications: List[Dict[str, Any]] = []

_permits: List[Dict[str, Any]] = [
    {"id": "permit-001", "user_id": "", "address": "1420 W Camelback Rd", "city": "Phoenix", "state": "AZ", "country": "USA", "region": "Central Phoenix", "county": "Maricopa", "lat": 33.5094, "lng": -112.0949, "project_class": "Commercial", "project_type": "New Construction", "description": "4-story mixed-use retail and residential building with concrete foundation and steel framing", "status": "Active", "value": 2400000, "issued_date": "2025-04-02", "builder_company": "Axiom Builders", "builder_name": "John Smith", "builder_phone": "602-555-0142", "builder_email": "john@axiombuilders.com", "applicant_company": "Desert Development LLC", "applicant_name": "Sarah Chen", "applicant_phone": "602-555-0198", "applicant_email": "schen@desertdev.com", "owner_company": "Camelback Partners LLC", "owner_name": "Robert Martinez", "owner_phone": "602-555-0211", "owner_email": "rmartinez@camelbackpartners.com", "additional_info": "ADA compliant, LEED certified target", "import_batch_id": "batch-demo-001", "created_at": "2025-04-10T10:00:00Z"},
    {"id": "permit-002", "user_id": "", "address": "340 N Central Ave", "city": "Phoenix", "state": "AZ", "country": "USA", "region": "Downtown Phoenix", "county": "Maricopa", "lat": 33.4484, "lng": -112.0740, "project_class": "Commercial", "project_type": "Tenant Improvement", "description": "Office suite renovation on floors 12-14, new mechanical systems and interior buildout", "status": "Pending", "value": 480000, "issued_date": "2025-03-15", "builder_company": "Mesa Construction Co", "builder_name": "David Lee", "builder_phone": "602-555-0301", "builder_email": "dlee@mesaconstruction.com", "applicant_company": "Central Office Partners", "applicant_name": "Jennifer Wu", "applicant_phone": "602-555-0312", "applicant_email": "jwu@centraloffice.com", "owner_company": None, "owner_name": "Thomas Brown", "owner_phone": "602-555-0402", "owner_email": None, "additional_info": None, "import_batch_id": "batch-demo-001", "created_at": "2025-04-10T10:00:00Z"},
    {"id": "permit-003", "user_id": "", "address": "88 E Van Buren St", "city": "Phoenix", "state": "AZ", "country": "USA", "region": "Downtown Phoenix", "county": "Maricopa", "lat": 33.4488, "lng": -112.0540, "project_class": "Industrial", "project_type": "Warehouse", "description": "Tilt-up concrete warehouse expansion, 18,000 sq ft addition with loading docks", "status": "Active", "value": 1100000, "issued_date": "2025-02-20", "builder_company": "Southwest Industrial Builders", "builder_name": None, "builder_phone": "480-555-0201", "builder_email": None, "applicant_company": "Phoenix Industrial LLC", "applicant_name": "Mark Thompson", "applicant_phone": "480-555-0215", "applicant_email": "mthompson@phxindustrial.com", "owner_company": "Phoenix Industrial LLC", "owner_name": "Mark Thompson", "owner_phone": "480-555-0215", "owner_email": "mthompson@phxindustrial.com", "additional_info": "Fire suppression upgrade included", "import_batch_id": "batch-demo-001", "created_at": "2025-04-10T10:00:00Z"},
    {"id": "permit-004", "user_id": "", "address": "7014 E Camelback Rd", "city": "Scottsdale", "state": "AZ", "country": "USA", "region": "Central Scottsdale", "county": "Maricopa", "lat": 33.4942, "lng": -111.9261, "project_class": "Commercial", "project_type": "Retail Build-Out", "description": "High-end retail space buildout with custom millwork, storefront glazing, and luxury finishes", "status": "Active", "value": 320000, "issued_date": "2025-04-10", "builder_company": "Prestige Build Group", "builder_name": "Emily Nguyen", "builder_phone": "480-555-0440", "builder_email": "emily@prestigebuild.com", "applicant_company": "Scottsdale Retail Partners", "applicant_name": "Chris Ford", "applicant_phone": "480-555-0455", "applicant_email": "cford@scottsdaleretail.com", "owner_company": "Camelback Plaza LLC", "owner_name": None, "owner_phone": None, "owner_email": None, "additional_info": None, "import_batch_id": "batch-demo-001", "created_at": "2025-04-10T10:00:00Z"},
    {"id": "permit-005", "user_id": "", "address": "120 S Mill Ave", "city": "Tempe", "state": "AZ", "country": "USA", "region": "Downtown Tempe", "county": "Maricopa", "lat": 33.4255, "lng": -111.9400, "project_class": "Residential", "project_type": "Multi-Family", "description": "6-story luxury apartment complex, 84 units with underground parking and rooftop amenities", "status": "Active", "value": 8700000, "issued_date": "2025-01-28", "builder_company": "Valley Residential Group", "builder_name": "Laura Kim", "builder_phone": "480-555-0550", "builder_email": "lkim@valleyresidential.com", "applicant_company": "Tempe Urban Living LLC", "applicant_name": "Ryan Patel", "applicant_phone": "480-555-0565", "applicant_email": "rpatel@tempeurbanliving.com", "owner_company": "Tempe Urban Living LLC", "owner_name": "Ryan Patel", "owner_phone": "480-555-0565", "owner_email": "rpatel@tempeurbanliving.com", "additional_info": "Near ASU campus, EV charging in garage", "import_batch_id": "batch-demo-001", "created_at": "2025-04-10T10:00:00Z"},
    {"id": "permit-006", "user_id": "", "address": "45 W Main St", "city": "Mesa", "state": "AZ", "country": "USA", "region": "Downtown Mesa", "county": "Maricopa", "lat": 33.4152, "lng": -111.8315, "project_class": "Commercial", "project_type": "Restaurant", "description": "Full-service restaurant conversion from retail, commercial kitchen installation and dining room renovation", "status": "Pending", "value": 195000, "issued_date": "2025-03-30", "builder_company": None, "builder_name": None, "builder_phone": None, "builder_email": None, "applicant_company": "Mesa Dining Partners", "applicant_name": "Angela Rodriguez", "applicant_phone": "480-555-0601", "applicant_email": "arodriguez@mesadining.com", "owner_company": None, "owner_name": "Angela Rodriguez", "owner_phone": "480-555-0601", "owner_email": "arodriguez@mesadining.com", "additional_info": None, "import_batch_id": "batch-demo-001", "created_at": "2025-04-10T10:00:00Z"},
    {"id": "permit-007", "user_id": "", "address": "2250 S Dobson Rd", "city": "Chandler", "state": "AZ", "country": "USA", "region": "South Chandler", "county": "Maricopa", "lat": 33.3062, "lng": -111.8413, "project_class": "Industrial", "project_type": "Distribution Center", "description": "New 45,000 sq ft distribution center with cross-dock loading, refrigerated storage section, office mezzanine", "status": "Active", "value": 4200000, "issued_date": "2025-02-14", "builder_company": "Chandler Industrial Group", "builder_name": "Kevin Walsh", "builder_phone": "480-555-0701", "builder_email": "kwalsh@chandlerindustrial.com", "applicant_company": "Southwest Logistics LLC", "applicant_name": "Patricia Okafor", "applicant_phone": "480-555-0715", "applicant_email": "pokafor@swlogistics.com", "owner_company": "Dobson Commerce Park LLC", "owner_name": None, "owner_phone": None, "owner_email": None, "additional_info": "ESFR sprinkler system, 32ft clear height", "import_batch_id": "batch-demo-001", "created_at": "2025-04-10T10:00:00Z"},
    {"id": "permit-008", "user_id": "", "address": "5800 N 67th Ave", "city": "Glendale", "state": "AZ", "country": "USA", "region": "North Glendale", "county": "Maricopa", "lat": 33.5387, "lng": -112.1860, "project_class": "Residential", "project_type": "Single Family", "description": "Custom single-family home, 4,200 sq ft, wood frame construction with stucco exterior and tile roof", "status": "Active", "value": 680000, "issued_date": "2025-04-05", "builder_company": "Sonoran Custom Homes", "builder_name": "Brad Foster", "builder_phone": "623-555-0801", "builder_email": "brad@sonorancustom.com", "applicant_company": None, "applicant_name": "Steven Garcia", "applicant_phone": "623-555-0810", "applicant_email": "sgarcia@email.com", "owner_company": None, "owner_name": "Steven Garcia", "owner_phone": "623-555-0810", "owner_email": "sgarcia@email.com", "additional_info": "Pool permit separate", "import_batch_id": "batch-demo-001", "created_at": "2025-04-10T10:00:00Z"},
    {"id": "permit-009", "user_id": "", "address": "10200 N 83rd Ave", "city": "Peoria", "state": "AZ", "country": "USA", "region": "North Peoria", "county": "Maricopa", "lat": 33.5806, "lng": -112.2374, "project_class": "Commercial", "project_type": "Medical Office", "description": "Medical office building, 12,000 sq ft, dental and urgent care tenant mix, ADA compliant design", "status": "Pending", "value": 1750000, "issued_date": "2025-03-22", "builder_company": "Healthcare Construction Services", "builder_name": "Diana Yee", "builder_phone": "623-555-0901", "builder_email": "dyee@hcsconstruction.com", "applicant_company": "Peoria Medical Group", "applicant_name": "Dr. James Lin", "applicant_phone": "623-555-0912", "applicant_email": "jlin@peoriamed.com", "owner_company": "Peoria Medical Group", "owner_name": "Dr. James Lin", "owner_phone": "623-555-0912", "owner_email": "jlin@peoriamed.com", "additional_info": "Medical gas systems, lead-lined rooms", "import_batch_id": "batch-demo-001", "created_at": "2025-04-10T10:00:00Z"},
    {"id": "permit-010", "user_id": "", "address": "1890 N Higley Rd", "city": "Gilbert", "state": "AZ", "country": "USA", "region": "North Gilbert", "county": "Maricopa", "lat": 33.3528, "lng": -111.7890, "project_class": "Residential", "project_type": "Multi-Family", "description": "Townhome development, 24 units, 3-story wood frame, attached garages, community pool", "status": "Active", "value": 3600000, "issued_date": "2025-03-08", "builder_company": "Gilbert Premier Homes", "builder_name": "Michelle Tran", "builder_phone": "480-555-1001", "builder_email": "mtran@gilbertpremier.com", "applicant_company": "East Valley Housing LLC", "applicant_name": "Craig Bishop", "applicant_phone": "480-555-1015", "applicant_email": "cbishop@evhousing.com", "owner_company": "East Valley Housing LLC", "owner_name": "Craig Bishop", "owner_phone": "480-555-1015", "owner_email": "cbishop@evhousing.com", "additional_info": "Photovoltaic solar on all units", "import_batch_id": "batch-demo-001", "created_at": "2025-04-10T10:00:00Z"},
    {"id": "permit-011", "user_id": "", "address": "8900 N Hayden Rd", "city": "Scottsdale", "state": "AZ", "country": "USA", "region": "North Scottsdale", "county": "Maricopa", "lat": 33.5450, "lng": -111.9261, "project_class": "Commercial", "project_type": "Hotel", "description": "Boutique hotel renovation, 48 rooms, new lobby, rooftop bar, fitness center upgrade", "status": "Active", "value": 2900000, "issued_date": "2025-02-01", "builder_company": "Luxury Build Associates", "builder_name": "Andrew Park", "builder_phone": "480-555-1101", "builder_email": "apark@luxurybuild.com", "applicant_company": "Scottsdale Hospitality Group", "applicant_name": "Vanessa Clark", "applicant_phone": "480-555-1115", "applicant_email": "vclark@scottsdalehosp.com", "owner_company": "Scottsdale Hospitality Group", "owner_name": "Vanessa Clark", "owner_phone": "480-555-1115", "owner_email": "vclark@scottsdalehosp.com", "additional_info": None, "import_batch_id": "batch-demo-001", "created_at": "2025-04-10T10:00:00Z"},
    {"id": "permit-012", "user_id": "", "address": "2400 W Thunderbird Rd", "city": "Phoenix", "state": "AZ", "country": "USA", "region": "North Phoenix", "county": "Maricopa", "lat": 33.6118, "lng": -112.0949, "project_class": "Commercial", "project_type": "Self-Storage", "description": "3-story climate-controlled self-storage facility, 650 units, drive-up access, 24-hour security", "status": "Expired", "value": 2100000, "issued_date": "2024-11-15", "builder_company": "Storage Solutions Builders", "builder_name": "Gary Nelson", "builder_phone": "602-555-1201", "builder_email": "gnelson@storagesolutions.com", "applicant_company": None, "applicant_name": "Gary Nelson", "applicant_phone": "602-555-1201", "applicant_email": "gnelson@storagesolutions.com", "owner_company": "Phoenix Storage Investments", "owner_name": None, "owner_phone": None, "owner_email": None, "additional_info": "Permit expired — refiling pending", "import_batch_id": "batch-demo-001", "created_at": "2025-04-10T10:00:00Z"},
    {"id": "permit-013", "user_id": "", "address": "1500 E Baseline Rd", "city": "Mesa", "state": "AZ", "country": "USA", "region": "South Mesa", "county": "Maricopa", "lat": 33.3760, "lng": -111.8315, "project_class": "Educational", "project_type": "School Addition", "description": "Elementary school gymnasium and cafeteria addition, 8,400 sq ft, pre-engineered metal building", "status": "Active", "value": 1400000, "issued_date": "2025-04-01", "builder_company": "Education Facility Builders", "builder_name": "Tamara West", "builder_phone": "480-555-1301", "builder_email": "twest@edfacilitybuilders.com", "applicant_company": "Mesa Unified School District", "applicant_name": "Frank Ortega", "applicant_phone": "480-555-1315", "applicant_email": "fortega@mesausd.org", "owner_company": "Mesa Unified School District", "owner_name": "Frank Ortega", "owner_phone": "480-555-1315", "owner_email": "fortega@mesausd.org", "additional_info": "Prevailing wage project", "import_batch_id": "batch-demo-001", "created_at": "2025-04-10T10:00:00Z"},
    {"id": "permit-014", "user_id": "", "address": "4200 N 32nd St", "city": "Phoenix", "state": "AZ", "country": "USA", "region": "Central Phoenix", "county": "Maricopa", "lat": 33.5000, "lng": -112.0000, "project_class": "Residential", "project_type": "Addition", "description": "Second story addition, 1,200 sq ft, new master suite and home office above existing garage", "status": "Active", "value": 145000, "issued_date": "2025-04-08", "builder_company": None, "builder_name": "Owner-Builder", "builder_phone": "602-555-1401", "builder_email": None, "applicant_company": None, "applicant_name": "James O'Brien", "applicant_phone": "602-555-1401", "applicant_email": "jobrien@email.com", "owner_company": None, "owner_name": "James O'Brien", "owner_phone": "602-555-1401", "owner_email": "jobrien@email.com", "additional_info": None, "import_batch_id": "batch-demo-001", "created_at": "2025-04-10T10:00:00Z"},
    {"id": "permit-015", "user_id": "", "address": "6200 E Indian School Rd", "city": "Scottsdale", "state": "AZ", "country": "USA", "region": "Central Scottsdale", "county": "Maricopa", "lat": 33.4972, "lng": -111.9000, "project_class": "Commercial", "project_type": "Fitness Center", "description": "New fitness center, 18,000 sq ft, group fitness studios, weight room, spin room, locker facilities", "status": "Pending", "value": 1850000, "issued_date": "2025-03-18", "builder_company": "Phoenix Commercial Group", "builder_name": "Nicole Burns", "builder_phone": "480-555-1501", "builder_email": "nburns@phxcommercial.com", "applicant_company": "Fit Life Scottsdale LLC", "applicant_name": "Bryan Castillo", "applicant_phone": "480-555-1515", "applicant_email": "bcastillo@fitlifescottsdale.com", "owner_company": None, "owner_name": None, "owner_phone": None, "owner_email": None, "additional_info": "Acoustic flooring required", "import_batch_id": "batch-demo-001", "created_at": "2025-04-10T10:00:00Z"},
    {"id": "permit-016", "user_id": "", "address": "3800 S Rural Rd", "city": "Tempe", "state": "AZ", "country": "USA", "region": "South Tempe", "county": "Maricopa", "lat": 33.3897, "lng": -111.9264, "project_class": "Commercial", "project_type": "Car Dealership", "description": "Automotive dealership showroom expansion, 6,000 sq ft addition, glass curtain wall facade", "status": "Active", "value": 890000, "issued_date": "2025-03-05", "builder_company": "Valley Commercial Builders", "builder_name": "Tony Ramirez", "builder_phone": "480-555-1601", "builder_email": "tramirez@valleycommercial.com", "applicant_company": "Arizona Auto Group", "applicant_name": "Sandra Hayes", "applicant_phone": "480-555-1615", "applicant_email": "shayes@azautogroup.com", "owner_company": "Arizona Auto Group", "owner_name": "Sandra Hayes", "owner_phone": "480-555-1615", "owner_email": "shayes@azautogroup.com", "additional_info": None, "import_batch_id": "batch-demo-001", "created_at": "2025-04-10T10:00:00Z"},
    {"id": "permit-017", "user_id": "", "address": "7300 W Greenway Rd", "city": "Phoenix", "state": "AZ", "country": "USA", "region": "Northwest Phoenix", "county": "Maricopa", "lat": 33.6289, "lng": -112.1400, "project_class": "Residential", "project_type": "New Construction", "description": "Production homebuilder subdivision, 42 single-family homes, wood frame, 1,800-2,400 sq ft plans", "status": "Active", "value": 12400000, "issued_date": "2025-01-10", "builder_company": "Meritage Homes", "builder_name": "Kevin Park", "builder_phone": "602-555-1701", "builder_email": "kpark@meritage.com", "applicant_company": "Meritage Homes Corp", "applicant_name": "Kevin Park", "applicant_phone": "602-555-1701", "applicant_email": "kpark@meritage.com", "owner_company": "Northwest Phoenix Development LLC", "owner_name": None, "owner_phone": None, "owner_email": None, "additional_info": "Phased construction over 18 months", "import_batch_id": "batch-demo-001", "created_at": "2025-04-10T10:00:00Z"},
    {"id": "permit-018", "user_id": "", "address": "1600 N Litchfield Rd", "city": "Goodyear", "state": "AZ", "country": "USA", "region": "West Valley", "county": "Maricopa", "lat": 33.4350, "lng": -112.3580, "project_class": "Industrial", "project_type": "Manufacturing", "description": "EV battery manufacturing facility, 120,000 sq ft, tilt-up construction, heavy power infrastructure", "status": "Active", "value": 28000000, "issued_date": "2025-02-28", "builder_company": "National Industrial Contractors", "builder_name": "Robert Chen", "builder_phone": "623-555-1801", "builder_email": "rchen@nationalindustrial.com", "applicant_company": "NextGen Energy Systems", "applicant_name": "Lisa Park", "applicant_phone": "623-555-1815", "applicant_email": "lpark@nexgenenergy.com", "owner_company": "NextGen Energy Systems", "owner_name": "Lisa Park", "owner_phone": "623-555-1815", "owner_email": "lpark@nexgenenergy.com", "additional_info": "DOE funding, prevailing wage", "import_batch_id": "batch-demo-001", "created_at": "2025-04-10T10:00:00Z"},
]


# ─── Import Batches ───────────────────────────────────────────────────────────

def insert_import_batch(batch: Dict[str, Any]) -> Dict[str, Any]:
    _import_batches.append(batch)
    return batch

def get_import_batches() -> List[Dict[str, Any]]:
    return list(_import_batches)

def update_import_batch(batch_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    for b in _import_batches:
        if b["id"] == batch_id:
            b.update(updates)
            return b
    return None


# ─── Projects ─────────────────────────────────────────────────────────────────

def _dedup_key(p: Dict[str, Any]) -> str:
    """Composite key for deduplication: normalized address + city + issued_date."""
    address = (p.get("address") or "").lower().strip()
    city    = (p.get("city") or "").lower().strip()
    issued  = (p.get("issued_date") or "").strip()
    return f"{address}|{city}|{issued}"


def upsert_projects(
    projects: List[Dict[str, Any]],
    batch_id: Optional[str] = None,
) -> Dict[str, int]:
    """
    Insert new projects or update existing ones by dedup key.
    Returns counts: { inserted, updated }.
    """
    existing_by_key: Dict[str, int] = {_dedup_key(p): i for i, p in enumerate(_projects)}
    today = date.today().isoformat()
    inserted = 0
    updated = 0

    for p in projects:
        if batch_id:
            p["import_batch_id"] = batch_id
        p["last_seen_date"] = today
        p["data_freshness"] = "fresh"

        key = _dedup_key(p)
        if key in existing_by_key:
            idx = existing_by_key[key]
            p["id"] = _projects[idx]["id"]  # preserve original ID
            _projects[idx] = p
            updated += 1
        else:
            _projects.append(p)
            existing_by_key[key] = len(_projects) - 1
            inserted += 1

    return {"inserted": inserted, "updated": updated}


def insert_projects(projects: List[Dict[str, Any]]) -> int:
    """Legacy insert — no dedup. Kept for backward compatibility."""
    _projects.extend(projects)
    return len(projects)


def get_all_projects() -> List[Dict[str, Any]]:
    return list(_projects)


def get_projects_filtered(
    user_id: Optional[str] = None,
    search: Optional[str] = None,
    project_type: Optional[str] = None,
    status: Optional[str] = None,
    city: Optional[str] = None,
    region: Optional[str] = None,
    builder_company: Optional[str] = None,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> List[Dict[str, Any]]:
    projects = list(_projects)
    # user_id="" in seed data means "shared demo data" — return for any user
    if user_id:
        projects = [p for p in projects if not p.get("user_id") or p.get("user_id") == user_id]
    if search:
        s = search.lower()
        projects = [p for p in projects if
                    s in (p.get("address") or "").lower() or
                    s in (p.get("city") or "").lower() or
                    s in (p.get("contractor_name") or "").lower() or
                    s in (p.get("description") or "").lower()]
    if project_type:
        projects = [p for p in projects if (p.get("permit_type") or "").lower() == project_type.lower()]
    if status:
        projects = [p for p in projects if (p.get("status") or "").lower() == status.lower()]
    if city:
        projects = [p for p in projects if (p.get("city") or "").lower() == city.lower()]
    if region:
        projects = [p for p in projects if (p.get("region") or "").lower() == region.lower()]
    if builder_company:
        bc = builder_company.lower()
        projects = [p for p in projects if bc in (p.get("contractor_name") or "").lower()]
    if min_value is not None:
        projects = [p for p in projects if (p.get("value") or 0) >= min_value]
    if max_value is not None:
        projects = [p for p in projects if (p.get("value") or 0) <= max_value]
    if date_from:
        projects = [p for p in projects if (p.get("issued_date") or "") >= date_from]
    if date_to:
        projects = [p for p in projects if (p.get("issued_date") or "") <= date_to]
    return projects


def update_project_coords(project_id: str, lat: float, lng: float) -> None:
    for p in _projects:
        if p["id"] == project_id:
            p["lat"] = lat
            p["lng"] = lng
            break


def get_project(project_id: str) -> Optional[Dict[str, Any]]:
    return next((p for p in _projects if p["id"] == project_id), None)


def mark_stale(batch_id: str) -> int:
    """Mark projects not seen in the given batch as stale."""
    count = 0
    for p in _projects:
        if p.get("import_batch_id") != batch_id:
            p["data_freshness"] = "stale"
            count += 1
    return count


# ─── Pipeline ─────────────────────────────────────────────────────────────────

_pipeline: List[Dict[str, Any]] = []
_activities: List[Dict[str, Any]] = []


def get_pipeline() -> List[Dict[str, Any]]:
    return list(_pipeline)


def add_to_pipeline(entry: Dict[str, Any]) -> Dict[str, Any]:
    # Avoid duplicates
    if any(e["project_id"] == entry["project_id"] for e in _pipeline):
        return next(e for e in _pipeline if e["project_id"] == entry["project_id"])
    # Ensure activity-tracking fields exist
    entry.setdefault("last_activity_at", None)
    entry.setdefault("next_action_type", None)
    entry.setdefault("next_action_due", None)
    _pipeline.append(entry)
    return entry


def update_pipeline_entry(project_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    for e in _pipeline:
        if e["project_id"] == project_id:
            e.update(updates)
            return e
    return None


def remove_from_pipeline(project_id: str) -> bool:
    before = len(_pipeline)
    _pipeline[:] = [e for e in _pipeline if e["project_id"] != project_id]
    return len(_pipeline) < before


# ─── Activities ────────────────────────────────────────────────────────────────

def _refresh_next_action(project_id: str) -> None:
    """Update pipeline entry's next_action fields based on pending activities."""
    entry = next((e for e in _pipeline if e["project_id"] == project_id), None)
    if not entry:
        return
    pending = [
        a for a in _activities
        if a["project_id"] == project_id and not a.get("completed_at")
    ]
    if pending:
        # Find soonest due_at among pending (None due_at treated as lowest priority)
        with_due = [a for a in pending if a.get("due_at")]
        if with_due:
            soonest = min(with_due, key=lambda a: a["due_at"])
            entry["next_action_type"] = soonest["type"]
            entry["next_action_due"] = soonest["due_at"]
        else:
            entry["next_action_type"] = pending[0]["type"]
            entry["next_action_due"] = None
    else:
        entry["next_action_type"] = None
        entry["next_action_due"] = None


def insert_activity(activity: Dict[str, Any]) -> Dict[str, Any]:
    _activities.append(activity)
    _refresh_next_action(activity["project_id"])
    # Update last_activity_at on the pipeline entry
    entry = next((e for e in _pipeline if e["project_id"] == activity["project_id"]), None)
    if entry:
        entry["last_activity_at"] = activity["created_at"]
    return activity


def get_activities_for_entry(pipeline_entry_id: str) -> List[Dict[str, Any]]:
    return [a for a in _activities if a.get("pipeline_entry_id") == pipeline_entry_id]


def get_all_activities() -> List[Dict[str, Any]]:
    return list(_activities)


def update_activity(activity_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    for a in _activities:
        if a["id"] == activity_id:
            a.update(updates)
            _refresh_next_action(a["project_id"])
            return a
    return None


# ─── Agents ───────────────────────────────────────────────────────────────────

def insert_agent(agent: Dict[str, Any]) -> Dict[str, Any]:
    _agents.append(agent)
    return agent

def get_all_agents() -> List[Dict[str, Any]]:
    return list(_agents)

def get_agent(agent_id: str) -> Optional[Dict[str, Any]]:
    return next((a for a in _agents if a["id"] == agent_id), None)

def update_agent(agent_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    for a in _agents:
        if a["id"] == agent_id:
            a.update(updates)
            return a
    return None


# ─── Emails ───────────────────────────────────────────────────────────────────

def insert_email(email: Dict[str, Any]) -> Dict[str, Any]:
    _emails.append(email)
    return email

def get_all_emails() -> List[Dict[str, Any]]:
    return list(_emails)


# ─── User Profiles ─────────────────────────────────────────────────────────────

def get_user_profile(user_id: str) -> Optional[Dict[str, Any]]:
    return _user_profiles.get(user_id)

def upsert_user_profile(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    existing = _user_profiles.get(user_id, {})
    existing.update(data)
    existing["user_id"] = user_id
    _user_profiles[user_id] = existing
    return existing


# ─── Discovery Jobs ────────────────────────────────────────────────────────────

def insert_discovery_job(job: Dict[str, Any]) -> Dict[str, Any]:
    _discovery_jobs.append(job)
    return job

def update_discovery_job(job_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    for j in _discovery_jobs:
        if j["id"] == job_id:
            j.update(updates)
            return j
    return None

def get_discovery_job(job_id: str) -> Optional[Dict[str, Any]]:
    return next((j for j in _discovery_jobs if j["id"] == job_id), None)

def get_discovery_job_by_city(city: str) -> Optional[Dict[str, Any]]:
    """Return the most recent non-failed job for a city."""
    city_lower = city.lower()
    matches = [j for j in _discovery_jobs if j.get("city", "").lower() == city_lower and j.get("status") != "failed"]
    if not matches:
        return None
    return sorted(matches, key=lambda j: j.get("created_at", ""), reverse=True)[0]


# ─── Notifications ─────────────────────────────────────────────────────────────

def insert_notification(notif: Dict[str, Any]) -> Dict[str, Any]:
    _notifications.append(notif)
    return notif

def get_notifications(user_id: str, unread_only: bool = False) -> List[Dict[str, Any]]:
    result = [n for n in _notifications if n.get("user_id") == user_id]
    if unread_only:
        result = [n for n in result if not n.get("read", False)]
    return sorted(result, key=lambda n: n.get("created_at", ""), reverse=True)

def mark_notifications_read(notification_ids: List[str]) -> None:
    for n in _notifications:
        if n["id"] in notification_ids:
            n["read"] = True


# ─── Watchlist ─────────────────────────────────────────────────────────────────

_watchlist: List[Dict[str, Any]] = []


def get_watchlist(user_id: str) -> List[Dict[str, Any]]:
    return [e for e in _watchlist if e.get("user_id") == user_id]


def add_to_watchlist(entry: Dict[str, Any]) -> Dict[str, Any]:
    uid = entry.get("user_id", "")
    name = entry.get("company_name", "")
    for e in _watchlist:
        if e.get("user_id") == uid and e.get("company_name") == name:
            e.update(entry)
            return e
    _watchlist.append(entry)
    return entry


def remove_from_watchlist(user_id: str, company_name: str) -> bool:
    before = len(_watchlist)
    _watchlist[:] = [e for e in _watchlist if not (e.get("user_id") == user_id and e.get("company_name") == company_name)]
    return len(_watchlist) < before


def update_watchlist_entry(user_id: str, company_name: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    for e in _watchlist:
        if e.get("user_id") == user_id and e.get("company_name") == company_name:
            e.update(updates)
            return e
    return None


# ─── Permits ───────────────────────────────────────────────────────────────────

def get_permits(
    user_id: str,
    search: Optional[str] = None,
    project_type: Optional[str] = None,
    status: Optional[str] = None,
    city: Optional[str] = None,
    region: Optional[str] = None,
    builder_company: Optional[str] = None,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> List[Dict[str, Any]]:
    results = list(_permits)
    if search:
        sl = search.lower()
        results = [p for p in results if any(
            sl in (p.get(f) or "").lower()
            for f in ("address", "city", "builder_company", "applicant_company",
                      "owner_company", "description", "project_type", "region")
        )]
    if project_type:
        results = [p for p in results if (p.get("project_type") or "").lower() == project_type.lower()]
    if status:
        results = [p for p in results if (p.get("status") or "").lower() == status.lower()]
    if city:
        results = [p for p in results if (p.get("city") or "").lower() == city.lower()]
    if region:
        results = [p for p in results if (p.get("region") or "").lower() == region.lower()]
    if builder_company:
        bl = builder_company.lower()
        results = [p for p in results if bl in (p.get("builder_company") or "").lower()]
    if min_value is not None:
        results = [p for p in results if (p.get("value") or 0) >= min_value]
    if max_value is not None:
        results = [p for p in results if (p.get("value") or 0) <= max_value]
    if date_from:
        results = [p for p in results if (p.get("issued_date") or "") >= date_from]
    if date_to:
        results = [p for p in results if (p.get("issued_date") or "") <= date_to]
    return sorted(results, key=lambda p: p.get("issued_date") or "", reverse=True)


def get_permit(permit_id: str) -> Optional[Dict[str, Any]]:
    return next((p for p in _permits if p["id"] == permit_id), None)


def add_permits(permits: List[Dict[str, Any]]) -> int:
    _permits.extend(permits)
    return len(permits)


def update_permit(permit_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    for i, p in enumerate(_permits):
        if p["id"] == permit_id:
            _permits[i] = {**p, **updates}
            return _permits[i]
    return None


def delete_permits_by_batch(batch_id: str) -> int:
    before = len(_permits)
    _permits[:] = [p for p in _permits if p.get("import_batch_id") != batch_id]
    return before - len(_permits)


def get_permit_batches(user_id: str) -> List[Dict[str, Any]]:
    seen = {}
    for p in _permits:
        bid = p.get("import_batch_id")
        if bid and bid not in seen:
            seen[bid] = {"id": bid, "permit_count": 0, "cities": set(), "created_at": p.get("created_at")}
        if bid:
            seen[bid]["permit_count"] += 1
            if p.get("city"):
                seen[bid]["cities"].add(p["city"])
    result = []
    for v in seen.values():
        v["cities"] = list(v["cities"])
        result.append(v)
    return result
