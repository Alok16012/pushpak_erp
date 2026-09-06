import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { INDIAN_STATES, DISTRICTS_BY_STATE, canonicalState } from "@/data/indianStates";
import { lookupPincode, geocode, uniqueSorted, type PostalPlace } from "@/lib/postal";

// Practical block/town/city mapping keyed by district slug.
const placesByDistrict: Record<string, { blocks: string[]; cities: string[] }> = {
  // --- Uttar Pradesh ---
  "Agra": { blocks: ["Agra", "Bah", "Etmadpur", "Fatehabad", "Khanpur", "Kheragarh"], cities: ["Agra", "Dayalbagh", "Fatehpur Sikri", "Kuberpur", "Tajganj"] },
  "Aligarh": { blocks: ["Atrauli", "Gabhana", "Hathras", "Iglas", "Khair", "Sikandra Rao"], cities: ["Aligarh", "Atrauli", "Hathras", "Khair", "Sikandra Rao"] },
  "Allahabad": { blocks: ["Bara", "Handia", "Koraon", "Meja", "Phulpur", "Soraon"], cities: ["Allahabad", "Handia", "Karchana", "Meja", "Phulpur"] },
  "Bareilly": { blocks: ["Aonla", "Baheri", "Faridpur", "Nawabganj", "Puranpur", "Shahganj"], cities: ["Aonla", "Baheri", "Bareilly", "Pilibhit", "Shahjahanpur"] },
  "Gautam Buddha Nagar": { blocks: ["Bisrakh", "Dadri", "Jewar", "Noida", "Surajpur"], cities: ["Dadri", "Greater Noida", "Jewar", "Noida", "Surajpur"] },
  "Ghaziabad": { blocks: ["Ghaziabad", "Loni", "Modinagar", "Muradnagar", "Raj Nagar", "Sahibabad"], cities: ["Dasna", "Ghaziabad", "Loni", "Modinagar", "Muradnagar"] },
  "Gorakhpur": { blocks: ["Bansgaon", "Campierganj", "Chauri Chaura", "Khajni", "Khalilabad", "Sahjanwa"], cities: ["Bansgaon", "Chauri Chaura", "Gorakhpur", "Khalilabad", "Sahjanwa"] },
  "Kanpur Nagar": { blocks: ["Bilhaur", "Chaubepur", "Ghatampur", "Maharajpur", "Sarsaul"], cities: ["Bilhaur", "Chobepur", "Ghatampur", "Kanpur", "Maharajpur"] },
  "Kanpur Dehat": { blocks: ["Akbarpur", "Bhognipur", "Malasa", "Sandalpur", "Wazidpur"], cities: ["Akbarpur", "Bhognipur", "Malasa", "Rasulabad", "Sikandra"] },
  "Lucknow": { blocks: ["Bakshi Ka Talab", "Malihabad", "Mau", "Mohanlalganj", "Sarojini Nagar"], cities: ["Bakshi Ka Talab", "Gosainganj", "Lucknow", "Malihabad", "Mau"] },
  "Mathura": { blocks: ["Chaumuha", "Farah", "Govardhan", "Mat", "Nandgaon"], cities: ["Chaumuha", "Govardhan", "Mahavan", "Mathura", "Vrindavan"] },
  "Meerut": { blocks: ["Hastinapur", "Jani", "Karnawal", "Kharkhoda", "Mawana", "Parikshitgarh"], cities: ["Hapur", "Mawana", "Meerut", "Modinagar", "Sardhana"] },
  "Moradabad": { blocks: ["Bilari", "Dilari", "Kanth", "Machhrehri", "Thakurdwara"], cities: ["Amroha", "Bilari", "Kanth", "Moradabad", "Sambhal"] },
  "Muzaffarnagar": { blocks: ["Budhana", "Charthawal", "Jansath", "Kandhla", "Khatauli", "Shamli"], cities: ["Budhana", "Jansath", "Khatauli", "Muzaffarnagar", "Shamli"] },
  "Varanasi": { blocks: ["Araja", "Araziline", "Chiraigaon", "Harahua", "Kashi Vidyapeeth", "Pindra"], cities: ["Chiraigaon", "Pindra", "Ramnagar", "Sarnath", "Varanasi"] },
  "Patna": { blocks: ["Bikram", "Bikramganj", "Danapur", "Dumraon", "Fatwah", "Hathidah", "Khusrupur", "Maner", "Masaurhi", "Naubatpur", "Nur Nagar", "Paliganj", "Patna Sadar", "Phulwarisharif", "Sampatchak"], cities: ["Bikram", "Danapur", "Fatwah", "Khusrupur", "Maner", "Masaurhi", "Nur Nagar", "Paliganj", "Patna", "Phulwarisharif"] },
  "Bhagalpur": { blocks: ["Bihpur", "Gopalpur", "Ismailpur", "Kahalgaon", "Kharik", "Narayanpur", "Nathnagar", "Naugachhia", "Pirpainti", "Sabour", "Sanhaula", "Sultanganj"], cities: ["Bhagalpur", "Gopalpur", "Kahalgaon", "Kharik", "Naugachhia", "Pirpainti", "Sultanganj"] },
  "Gaya": { blocks: ["Amas", "Banke Bazar", "Bodh Gaya", "Dobhi", "Dumaria", "Fatehpur", "Gaya Town", "Ghelhu", "Goriyakothi", "Gurua", "Imamganj", "Kaler", "Kochas", "Konch", "Manpur", "Mohanpur", "Nauhatta", "Nawada", "Neemchak Bathani", "Pakri Barawan", "Paraiya", "Rajpur", "Roh", "Shahpur", "Sherghati", "Sikandra", "Tikari", "Wazirganj"], cities: ["Amas", "Banke Bazar", "Bodh Gaya", "Dobhi", "Dumaria", "Fatehpur", "Gaya", "Gurua", "Kaler", "Kochas", "Konch", "Manpur", "Mohanpur", "Nawada", "Neemchak Bathani", "Paraiya", "Rajpur", "Roh", "Shahpur", "Sherghati", "Sikandra", "Tekari", "Tikari", "Wazirganj"] },
  "Muzaffarpur": { blocks: ["Aurai", "Baruraj", "Bochahan", "Desri", "Gaighat", "Gayghat", "Hajipur", "Jandaha", "Kanti", "Kurhani", "Lalganj", "Mahnar", "Mahua", "Marhaura", "Minapur", "Patedhi Belsar", "Patepur", "Raghopur", "Rajapakar", "Sahdei Buzurg", "Sakra", "Saraiya", "Vaishali"], cities: ["Aurai", "Baruraj", "Bochahan", "Desri", "Gaighat", "Gayghat", "Hajipur", "Jandaha", "Kanti", "Kurhani", "Lalganj", "Mahnar", "Mahua", "Marhaura", "Minapur", "Motihari", "Muzaffarpur", "Patedhi Belsar", "Patepur", "Raghopur", "Rajapakar", "Sahdei Buzurg", "Sakra", "Saraiya", "Sheohar", "Sitamarhi", "Vaishali"] },
  "Darbhanga": { blocks: ["Alinagar", "Andhrathadi", "Babhangama", "Bahadurpur", "Basauli", "Benipatti", "Benipur", "Biraul", "Ghanshyampur", "Ghoghardiha", "Hanuman Nagar", "Jhanjharpur", "Kaluahi", "Keoti", "Khadauwan", "Kusheshwar Asthan", "Ladania", "Lakhnaur", "Madhubani", "Madhwapur", "Manigachhi", "Pandaul", "Phulparas", "Rajnagar", "Singhwara", "Thakurganj"], cities: ["Andhrathadi", "Babhangama", "Basauli", "Benipatti", "Benipur", "Darbhanga", "Ghoghardiha", "Jhanjharpur", "Kaluahi", "Khadauwan", "Lakhnaur", "Madhubani", "Madhwapur", "Pandaul", "Phulparas", "Rajnagar", "Samastipur", "Thakurganj"] },
  "Nawada": { blocks: ["Akbarpur", "Bihariganj", "Kashi Chak", "Meskaur", "Nardiganj", "Pakri Barawan", "Rajoli", "Roh", "Sirdala", "Theka"], cities: ["Hisua", "Meskaur", "Nardiganj", "Nawada", "Warisaliganj"] },
  "Saran": { blocks: ["Amnour", "Baniapur", "Chapra", "Dariapur", "Daudnagar", "Dighwara", "Garkha", "Ishupur", "Jalalpur", "Lakshmipur", "Manjhi", "Marhaura", "Nagra", "Nayagaon", "Panapur", "Parsa", "Patna", "Revelganj", "Sonepur", "Taraiya"], cities: ["Amnour", "Baniapur", "Chhapra", "Dariapur", "Daudnagar", "Garkha", "Ishupur", "Jalalpur", "Lakshmipur", "Marhaura", "Nagra", "Panapur", "Parsa", "Revelganj", "Sonepur", "Taraiya"] },
  "Vaishali": { blocks: ["Bhagwanpur", "Bidupur", "Chehra Kalan", "Desri", "Goraul", "Hajipur", "Jandaha", "Lalganj", "Mahnar", "Mahua", "Patedhi Belsar", "Patepur", "Raghopur", "Raja Pakar", "Sahdei Buzurg", "Vaishali"], cities: ["Desri", "Hajipur", "Lalganj", "Mahua", "Raghopur"] },
  "Madhubani": { blocks: ["Andhrathadi", "Babhangama", "Basauli", "Benipatti", "Ghoghardiha", "Jhanjarpur", "Kaluahi", "Khutauna", "Ladaniya", "Lakhnaur", "Madhwapur", "Pandaul", "Phulparas", "Rajnagar", "Saharsa", "Thakurganj"], cities: ["Benipatti", "Jhanjarpur", "Kaluahi", "Madhubani", "Phulparas"] },
  // --- Maharashtra ---
  "Mumbai City": { blocks: ["Antop Hill", "Byculla", "Chinchpokli", "Colaba", "Cotton Green", "Dadar", "Dharavi", "Fort", "Girgaon", "Grant Road", "Lower Parel", "Malabar Hill", "Marine Lines", "Matunga", "Mazagaon", "Parel", "Sewri", "Sion", "Wadala", "Worli"], cities: ["Colaba", "Fort", "Malabar Hill", "Marine Lines", "Mumbai South"] },
  "Mumbai Suburban": { blocks: ["Andheri", "Bandra", "Borivali", "Chembur", "Dadar", "Dahisar", "Ghatkopar", "Goregaon", "Jogeshwari", "Juhu", "Kandivali", "Khar", "Kurla", "Mahim", "Malad", "Parel", "Powai", "Santacruz", "Vile Parle", "Worli"], cities: ["Andheri", "Bandra", "Borivali", "Chembur", "Goregaon", "Juhu", "Kurla", "Malad", "Powai", "Vile Parle"] },
  "Pune": { blocks: ["Akole", "Ambegaon", "Baramati", "Bhor", "Daund", "Haveli", "Indapur", "Junnar", "Khed", "Kopargaon", "Maval", "Mulshi", "Nevasa", "Parner", "Pathardi", "Pune City", "Pune Rural", "Purandhar", "Rahata", "Sangamner", "Shevgaon", "Shirur", "Shrirampur", "Velhe"], cities: ["Ambegaon", "Baramati", "Bhor", "Daund", "Haveli", "Indapur", "Junnar", "Khed", "Kopargaon", "Lonavala", "Maval", "Mulshi", "Nevasa", "Parner", "Pathardi", "Pimpri-Chinchwad", "Pune", "Purandhar", "Rahata", "Saswad", "Shevgaon", "Shirur", "Shrirampur", "Talegaon", "Velhe"] },
  "Nagpur": { blocks: ["Bhiwapur", "Hingna", "Kalmeshwar", "Kamptee", "Katol", "Kuhi", "Mauda", "Nagpur Rural", "Nagpur Urban", "Narkhed", "Parseoni", "Ramtek", "Savner", "Umred"], cities: ["Hingna", "Kalmeshwar", "Kamptee", "Katol", "Nagpur", "Ramtek", "Savner", "Umred"] },
  "Thane": { blocks: ["Ambarnath", "Badlapur", "Bhiwandi", "Dombivli", "Jawhar", "Kalyan", "Mira-Bhayandar", "Mokhada", "Murbad", "Nallasopara", "Palghar", "Shahapur", "Talasari", "Thane", "Ulhasnagar", "Vasai", "Vikramgad", "Wada"], cities: ["Badlapur", "Bhiwandi", "Dombivli", "Jawhar", "Kalyan", "Mira Road", "Mokhada", "Murbad", "Nallasopara", "Palghar", "Shahapur", "Talasari", "Thane", "Ulhasnagar", "Vasai", "Vikramgad", "Wada"] },
  "Nashik": { blocks: ["Baglan", "Chandvad", "Chandwad", "Deola", "Deolali", "Dindori", "Igatpuri", "Kalwan", "Malegaon", "Nandgaon", "Nashik", "Niphad", "Peint", "Satana", "Sinnar", "Surgana", "Trimbakeshwar", "Yeola"], cities: ["Baglan", "Chandvad", "Chandwad", "Deola", "Dindori", "Igatpuri", "Kalwan", "Malegaon", "Nashik", "Niphad", "Peint", "Satana", "Sinnar", "Surgana", "Trimbak", "Yeola"] },
  "Aurangabad": { blocks: ["Aurangabad", "Gangapur", "Kannad", "Khuldabad", "Lasur", "Paithan", "Palthan", "Phulambri", "Shevgaon", "Sillod", "Soegaon", "Vaijapur"], cities: ["Aurangabad", "Gangapur", "Jalna", "Kannad", "Paithan", "Phulambri", "Sillod", "Vaijapur"] },
  "Solapur": { blocks: ["Akkalkot", "Barshi", "Karmala", "Madha", "Mangalvedhe", "Mohol", "North Solapur", "Pandharpur", "Sangole", "South Solapur"], cities: ["Akkalkot", "Barshi", "Karmala", "Mangalwedha", "Mohol", "Pandharpur", "Solapur"] },
  // --- Gujarat ---
  "Ahmedabad": { blocks: ["Ahmedabad City", "Bavla", "Daskroi", "Detroj-Rampura", "Dhandhuka", "Dholera", "Dholka", "Mandal", "Matar", "Petlad", "Sanand", "Viramgam"], cities: ["Ahmedabad", "Bavla", "Detroj", "Dhandhuka", "Dholka", "Sanand", "Viramgam"] },
  "Surat": { blocks: ["Bardoli", "Chorasi", "Choryasi", "Kamrej", "Mahuva", "Mandvi", "Olpad", "Palsana", "Surat City"], cities: ["Bardoli", "Kamrej", "Mahuva", "Mandvi", "Navsari", "Olpad", "Surat"] },
  "Vadodara": { blocks: ["Dabhoi", "Desar", "Karjan", "Padra", "Savli", "Sinor", "Vadodara City", "Waghodia"], cities: ["Dabhoi", "Desar", "Karjan", "Padra", "Savli", "Vadodara", "Waghodia"] },
  "Rajkot": { blocks: ["Dhoraji", "Gondal", "Jamkandorna", "Jetpur", "Lodhika", "Paddhari", "Rajkot City", "Rapar", "Upleta"], cities: ["Dhoraji", "Gondal", "Jamkandorna", "Jetpur", "Rajkot", "Upleta"] },
  "Bhavnagar": { blocks: ["Bhavnagar City", "Gariadhar", "Palitana", "Sihor", "Talaja", "Umrala", "Vallabhipur"], cities: ["Bhavnagar", "Gariadhar", "Palitana", "Sihor", "Talaja", "Vallabhipur"] },
  "Jamnagar": { blocks: ["Dhrol", "Jam Kandorna", "Jamnagar City", "Jodiya", "Kalavad", "Khambhaliya", "Lalpur", "Okhamandal"], cities: ["Dhrol", "Jamnagar", "Jodiya", "Khambhaliya", "Okha", "Porbandar"] },
  "Junagadh": { blocks: ["Bhesana", "Junagadh", "Junagadh City", "Keshod", "Malia", "Mendarda", "Vanthali", "Visavadar"], cities: ["Junagadh", "Keshod", "Mendarda", "Porbandar", "Vanthali", "Visavadar"] },
  "Kutch": { blocks: ["Abdasa", "Bhachau", "Bhuj", "Lakhpat", "Mandvi", "Mundra", "Nakhatrana", "Rapar"], cities: ["Anjar", "Bhachau", "Bhuj", "Gandhidham", "Mandvi", "Mundra", "Rapar"] },
  // --- Karnataka ---
  "Bangalore Urban": { blocks: ["Anekal", "Bangalore East", "Bangalore North", "Bangalore South", "Bommanahalli", "Dasarahalli", "Kengeri", "Mahadevapura", "Rajajinagar", "Yelahanka"], cities: ["Anekal", "Bangalore", "Electronic City", "Jayanagar", "Kengeri", "Whitefield", "Yelahanka"] },
  "Bangalore Rural": { blocks: ["Anekal", "Channapatna", "Devanahalli", "Dod Ballapur", "Hoskote", "Kanakapura", "Magadi", "Nelamangala", "Ramanagara"], cities: ["Channapatna", "Devanahalli", "Dod Ballapur", "Hoskote", "Magadi", "Nelamangala"] },
  "Mysore": { blocks: ["Bettahalli", "Gundlupet", "H.D.Kote", "Hunsur", "Krishnarajanagara", "Mysore", "Nanjangud", "Piriyapatna", "Saligrama", "T.Narsipur"], cities: ["Gundlupet", "Hunsur", "Krishnarajanagara", "Mysore", "Nanjangud", "Piriyapatna"] },
  "Belgaum": { blocks: ["Athani", "Bageshwar", "Bailhongal", "Belgaum", "Chikkodi", "Gokak", "Hukeri", "Kagawad", "Khanapur", "Mudalagi", "Mugalkhod", "Nippani", "Ramdurg", "Raybag", "Saundatti", "Yaragatti"], cities: ["Athani", "Bailhongal", "Belgaum", "Chikkodi", "Gokak", "Hukeri", "Kagawad", "Khanapur", "Mudalagi", "Mugalkhod", "Nippani", "Ramdurg", "Raybag", "Saundatti", "Yaragatti"] },
  "Mangalore": { blocks: ["Bantwal", "Beltangady", "Belthangadi", "Kadaba", "Mangalore", "Moodabidri", "Puttur", "Sulya"], cities: ["Bantwal", "Karkala", "Mangalore", "Moodabidri", "Puttur", "Sulya", "Udupi"] },
  // --- Tamil Nadu ---
  "Chennai": { blocks: ["Adyar", "Ambattur", "Aminjikarai", "Avadi", "Ayanavaram", "Egmore", "Guindy", "Madhavaram", "Mambalam", "Mylapore", "Perambur", "Poonamallee", "Saidapet", "Sholinganallur", "Tambaram", "Tondiarpet", "Velachery"], cities: ["Ambattur", "Avadi", "Chennai", "Guindy", "Madhavaram", "Perambur", "Poonamallee", "Tambaram", "Velachery"] },
  "Coimbatore": { blocks: ["Annur", "Coimbatore North", "Coimbatore South", "Kinathukadavu", "Madukkarai", "Mettupalayam", "Sulur", "Thondamuthur", "Valparai"], cities: ["Annur", "Coimbatore", "Kinathukadavu", "Mettupalayam", "Pollachi", "Sulur", "Valparai"] },
  "Madurai": { blocks: ["Chekkurani", "Madurai East", "Madurai North", "Madurai South", "Madurai West", "Peraiyur", "Sedapatti", "Thiruparankundram", "Tirumangalam", "Usilampatti"], cities: ["Madurai", "Melur", "Peraiyur", "Thirumangalam", "Tirumangalam", "Usilampatti", "Vadipatti"] },
  "Salem": { blocks: ["Attayampatti", "Konganapuram", "Mecheri", "Omalur", "Panaimarathupatti", "Salem East", "Salem North", "Salem South", "Salem West", "Sankari", "Vazhapadi", "Veerapandi", "Yercaud"], cities: ["Attayampatti", "Konganapuram", "Mecheri", "Omalur", "Salem", "Yercaud"] },
  "Tiruchirappalli": { blocks: ["Lalgudi", "Manachanallur", "Manapparai", "Musiri", "Thiruverumbur", "Thottiyam", "Thuraiyur", "Tiruchirappalli East", "Tiruchirappalli West", "Uppiliapuram"], cities: ["Karur", "Lalgudi", "Manapparai", "Musiri", "Thanjavur", "Thiruverumbur", "Tiruchirappalli"] },
  // --- West Bengal ---
  "Kolkata": { blocks: ["Ballygunge", "Beleghata", "Burrabazar", "Entally", "Garden Reach", "Jadavpur", "Kasba", "Kolkata Port", "Maniktala", "Moula Ali", "Park Street", "Sealdah", "Shyampukur", "Tollygunge", "Topsia", "Ward 1", "Ward 10", "Ward 11", "Ward 12", "Ward 13", "Ward 14", "Ward 15", "Ward 16", "Ward 17", "Ward 18", "Ward 19", "Ward 2", "Ward 20", "Ward 3", "Ward 4", "Ward 5", "Ward 6", "Ward 7", "Ward 8", "Ward 9"], cities: ["Alipore", "Bally", "Baranagar", "Barasat", "Bhowanipore", "Burrabazar", "Dum Dum", "Entally", "Howrah", "Kolkata", "Madhyamgram", "Maidan", "New Town", "Rajarahat", "Salt Lake", "Tollygunge"] },
  "Howrah": { blocks: ["Amta I", "Amta II", "Bagnan I", "Bagnan II", "Bally Jagachha", "Domjur", "Jagatballavpur", "Jangipara", "Panchla", "Sankrail", "Shyampur I", "Shyampur II", "Uluberia", "Uluberia I", "Uluberia II"], cities: ["Amta", "Bagnan", "Bally", "Domjur", "Howrah", "Jagatballavpur", "Panchla", "Sankrail", "Shyampur", "Uluberia"] },
  "North 24 Parganas": { blocks: ["Baduria", "Bagdah", "Barasat I", "Barasat II", "Barrackpore I", "Barrackpore II", "Basirhat I", "Basirhat II", "Bongaon", "Deganga", "Gaighata", "Habra I", "Habra II", "Haringhata", "Haroa", "Hasnabad", "Minakhan", "Rajarhat", "Sandeshkhali I", "Sandeshkhali II"], cities: ["Ashoknagar", "Bangaon", "Barasat", "Barrackpore", "Basirhat", "Bhatpara", "Bidhannagar", "Bongaon", "Deganga", "Habra", "Haroa", "Kalyani", "Madhyamgram", "Naihati", "Rajarhat", "Taki"] },
  "South 24 Parganas": { blocks: ["Alipore", "Baruipur", "Basanti", "Bhangar I", "Bhangar II", "Bishnupur I", "Bishnupur II", "Budge Budge I", "Budge Budge II", "Canning", "Canning I", "Canning II", "Diamond Harbour I", "Diamond Harbour II", "Falta", "Gosaba", "Jadabpur", "Jaynagar I", "Jaynagar II", "Kakdwip", "Kulpi", "Magrahat I", "Magrahat II", "Mandirbazar", "Mathurapur I", "Mathurapur II", "Moung", "Patharpratima", "Sagar", "Sonarpur"], cities: ["Alipore", "Baruipur", "Basanti", "Bhangar", "Budge Budge", "Canning", "Diamond Harbour", "Falta", "Gosaba", "Harinbari", "Jaynagar", "Kolkata", "Kulpi", "Magrahat", "Mathurapur", "Moung", "Patharpratima", "Sagar", "Sonarpur", "Tilpi"] },
  "East Midnapore": { blocks: ["Bhagabanpur I", "Bhagabanpur II", "Chandipur", "Contai I", "Contai II", "Contai III", "Deshapran", "Egra I", "Egra II", "Khejuri I", "Khejuri II", "Moyna", "Nandakumar", "Panskura I", "Panskura II", "Potashpur", "Purba Medinipur", "Ramnagar I", "Ramnagar II", "Sahid Matangini", "Tamluk"], cities: ["Bhagabanpur", "Contai", "Deshapran", "Egra", "Khejuri", "Mahishadal", "Moyna", "Nandakumar", "Panskura", "Ramnagar", "Sahid Matangini", "Tamluk"] },
  "West Midnapore": { blocks: ["Dantan I", "Dantan II", "Daspur I", "Daspur II", "Debra", "Ghatal", "Gobindapur", "Jamboni", "Jhargram", "Keshiari", "Keshpur", "Kharagpur I", "Kharagpur II", "Midnapore Sadar", "Narayangarh", "Pingla", "Sabang", "Salboni", "Sankrail", "Sarenga"], cities: ["Dantan", "Daspur", "Debra", "Ghatal", "Jhargram", "Keshiari", "Kharagpur", "Midnapore", "Narayangarh", "Pingla", "Sabang", "Salboni"] },
  "Hooghly": { blocks: ["Arambagh", "Balagarh", "Chanditala I", "Chanditala II", "Chinsurah-Magra", "Dhaniakhali", "Goghat I", "Goghat II", "Haripal", "Jagatballavpur", "Khanakul I", "Khanakul II", "Mogra", "Pandua", "Polba-Dadpur", "Pursurah", "Serampore Uttarpara", "Singur", "Tarakeswar"], cities: ["Arambagh", "Bally", "Bandel", "Chandannagar", "Chinsurah", "Dankuni", "Dhaniakhali", "Haripal", "Hooghly", "Pandua", "Polba", "Pursurah", "Rishra", "Serampore", "Singur", "Tarakeswar"] },
  "Nadia": { blocks: ["Chakdaha", "Chapra", "Hanskhali", "Haringhata", "Kaliganj", "Karimpur I", "Karimpur II", "Krishnaganj", "Krishnapur", "Nabadwip", "Nakashipara", "Plassey", "Ranaghat I", "Ranaghat II", "Sabad Krishnapur", "Santipur", "Tehatta I", "Tehatta II"], cities: ["Chakdaha", "Haringhata", "Kalyani", "Karimpur", "Krishnaganj", "Krishnanagar", "Nabadwip", "Nakashipara", "Plassey", "Ranaghat", "Santipur", "Tehatta"] },
  // --- Bihar ---
  "West Champaran": { blocks: ["Bagaha", "Bettiah", "Bodh Gaya", "Chanpatia", "Dhaka", "Gaunaha", "Harsidhi", "Jogapatti", "Lauriya", "Lauriya Nandangarh", "Madhuban", "Mainatand", "Narkatiaganj", "Nautan", "Nawabganj", "Pawai", "Ramnagar", "Sidhaw", "Sikta", "Sugauli", "Tetaria", "Valmiki Nagar"], cities: ["Bagaha", "Bettiah", "Bodh Gaya", "Chanpatia", "Dhaka", "Gaunaha", "Harsidhi", "Jogapatti", "Lauriya", "Lauriya Nandangarh", "Madhuban", "Mainatand", "Narkatiaganj", "Nautan", "Nawabganj", "Pawai", "Ramnagar", "Sidhaw", "Sikta", "Sugauli", "Tetaria", "Valmiki Nagar"] },
  "East Champaran": { blocks: ["Adapur", "Areraj", "Banjaria", "Bankatwa", "Chakia", "Chiraia", "Dhaka", "Kesaria", "Kotwa", "Madhuban", "Mehsi", "Motihari", "Nagra", "Paharpur", "Pipra", "Purba Champaran", "Raxaul", "Sangrampur", "Sikta", "Sugauli", "Tetaria", "Turkaulia"], cities: ["Adapur", "Areraj", "Banjar", "Bankatwa", "Chakia", "Chiraia", "Dhaka", "Kesaria", "Kotwa", "Madhuban", "Mehsi", "Motihari", "Nagra", "Paharpur", "Pipra", "Purba Champaran", "Raxaul", "Sangrampur", "Sikta", "Sugauli", "Tetaria", "Turkaulia"] },
  // --- Rajasthan ---
  "Jaipur": { blocks: ["Amber", "Bassi", "Chaksu", "Chomu", "Dudu", "Jaipur", "Jamwa Ramgarh", "Kotputli", "Phagi", "Sanganer", "Shahpura", "Viratnagar"], cities: ["Amber", "Bassi", "Chomu", "Dudu", "Jaipur", "Jamwa Ramgarh", "Kotputli", "Phagi", "Sanganer", "Shahpura", "Viratnagar"] },
  "Jodhpur": { blocks: ["Balesar", "Bhopalgarh", "Bilara", "Jodhpur", "Luni", "Osian", "Phalodi", "Shergarh"], cities: ["Balesar", "Bhopalgarh", "Bilara", "Jodhpur", "Luni", "Osian", "Pali", "Phalodi", "Shergarh"] },
  "Kota": { blocks: ["Anta", "Atru", "Baran", "Chhabra", "Chhipabarod", "Digod", "Kota", "Mangrol", "Nainwa", "Pipalda", "Ramganj Mandi", "Sangod", "Suket"], cities: ["Anta", "Atru", "Baran", "Bundi", "Chhabra", "Digod", "Kota", "Ramganj Mandi", "Sangod", "Suket"] },
  "Udaipur": { blocks: ["Badgaon", "Bhinder", "Girwa", "Gogunda", "Jhadol", "Kotra", "Lasadiya", "Mavli", "Rishabhdeo", "Salumbar", "Sarada", "Semari", "Sukher", "Udaipur", "Vallabhnagar"], cities: ["Girwa", "Jhadol", "Kotra", "Mavli", "Nathdwara", "Rishabhdeo", "Salumbar", "Sarada", "Semari", "Udaipur", "Vallabhnagar"] },
  "Ajmer": { blocks: ["Ajmer", "Arain", "Bhilwara", "Bhinai", "Hurda", "Jaitaran", "Kekri", "Kishangarh", "Masuda", "Nasirabad", "Peeplu", "Pushkar", "Sarwar", "Todaraisingh", "Vijainagar"], cities: ["Ajmer", "Kekri", "Kishangarh", "Masuda", "Nasirabad", "Pushkar", "Sarwar", "Todaraisingh", "Vijainagar"] },
  // --- Punjab ---
  "Ludhiana": { blocks: ["Dehlon", "Doraha", "Dudhansu Kalan", "Gurusar Sudhar", "Jagraon", "Jodhan", "Kang", "Khamano", "Khanna", "Killa Raipur", "Kot Ise Khan", "Latala", "Ludhiana East", "Ludhiana West", "Machhiwara", "Malaudh", "Mangat", "Nurmahal", "Payal", "Raikot", "Rakhra", "Rampur", "Samrala", "Sudhar", "Talwandi Rai", "Thikriwal", "Vill"], cities: ["Dehlon", "Doraha", "Dudhansu Kalan", "Gurusar Sudhar", "Jagraon", "Jodhan", "Kang", "Khamano", "Khanna", "Killa Raipur", "Kot Ise Khan", "Latala", "Ludhiana", "Machhiwara", "Malaudh", "Mangat", "Nurmahal", "Payal", "Raikot", "Rakhra", "Rampur", "Samrala", "Sudhar", "Talwandi Rai", "Thikriwal", "Vill"] },
  "Amritsar": { blocks: ["Ajnala", "Amritsar", "Attari", "Baba Bakala", "Chogawan", "Darsibaba", "Dharamkot", "Jandiala Guru", "Khadur Sahib", "Majitha", "Patti", "Rayya", "Tarn Taran", "Verka", "Zira"], cities: ["Ajnala", "Amritsar", "Attari", "Baba Bakala", "Chogawan", "Darsibaba", "Dharamkot", "Jandiala Guru", "Khadoor Sahib", "Majitha", "Patti", "Rayya", "Tarn Taran", "Verka", "Zira"] },
  "Jalandhar": { blocks: ["Adampur", "Baba Bakala", "Bhogpur", "Jalandhar East", "Jalandhar North", "Jalandhar South", "Jalandhar West", "Lohian Khas", "Nakodar", "Phillaur", "Shahkot", "Sultanpur Lodhi", "Talwandi Chaudhrian", "Urmar Tanda"], cities: ["Adampur", "Bhogpur", "Jalandhar", "Lohian Khas", "Nakodar", "Phillaur", "Shahkot", "Sultanpur Lodhi", "Talwandi Chaudhrian", "Urmar Tanda"] },
  "Patiala": { blocks: ["Banur", "Bhunerheri", "Chungharh", "Derabassi", "Dhilwan", "Ghanaur", "Gharachon", "Gill", "Jhandian", "Kartarpur", "Kotla Nihang", "Kultham", "Lehragaga", "Malerkotla", "Moonak", "Nabha", "Nangal", "Patiala", "Patran", "Rajpura", "Rakhra", "Samana", "Sanaur", "Sirhind", "Sohana", "Tapa", "Urban Estate", "Urban Estate Phase I", "Urban Estate Phase II", "Urban Estate Phase III"], cities: ["Banur", "Derabassi", "Ghanaur", "Lehragaga", "Malerkotla", "Moonak", "Nabha", "Patiala", "Patran", "Rajpura", "Samana", "Sanaur", "Sirhind", "Tapa"] },
  // --- Andhra Pradesh ---
  "Visakhapatnam": { blocks: ["Anakapalle", "Anandapuram", "Bheemunipatnam", "Chodavaram", "Gajuwaka", "Gopalapatnam", "Kotauratla", "Madugula", "Munagapaka", "Nakkapalli", "Narsipatnam", "Pedagantyada", "Pendurthi", "Rambilli", "Sabbavaram", "Seethammadhara", "Srungavarapukota", "Vepagunta", "Visakhapatnam"], cities: ["Anakapalle", "Anandapuram", "Bheemunipatnam", "Chodavaram", "Gajuwaka", "Kotauratla", "Madugula", "Munagapaka", "Nakkapalli", "Narsipatnam", "Pedagantyada", "Pendurthi", "Rambilli", "Sabbavaram", "Seethammadhara", "Srungavarapukota", "Vepagunta", "Visakhapatnam", "Vizag"] },
  "Vijayawada": { blocks: ["Bapulapadu", "Gannavaram", "Ibrahimpatnam", "Kankipadu", "Kondapalli", "Mopidevi", "Movva", "Mylavaram", "Nagayalanka", "Nandivada", "Pamarru", "Pedaparupudi", "Penamaluru", "Reddigudem", "Thotlavalluru", "Unguturu", "Veerullapadu", "Vijayawada", "Vuyyuru"], cities: ["Bapatla", "Chilakaluripet", "Dachepalle", "Guntur", "Macherla", "Mangalagiri", "Narasaraopet", "Ponnur", "Repalle", "Sattenapalle", "Tadepalligudem", "Tenali", "Vijayawada", "Vinukonda"] },
  "Guntur": { blocks: ["Bapatla", "Cherukupalle", "Duggirala", "Guntur", "Karlapalem", "Kollipara", "Kollur", "Mangalagiri", "Nadendla", "Nekarikallu", "Pedakurapadu", "Rajupalem", "Sattenapalle", "Tadepalle", "Tadikonda", "Tenali", "Thulluru", "Vatticherukuru", "Vemuru"], cities: ["Bapatla", "Chilakaluripet", "Dachepalle", "Guntur", "Macherla", "Mangalagiri", "Narasaraopet", "Ponnur", "Repalle", "Sattenapalle", "Tadepalligudem", "Tenali", "Vinukonda"] },
  // --- Delhi ---
  "New Delhi": { blocks: ["Chanakyapuri", "Connaught Place", "Darya Ganj", "Delhi Cantonment", "Karol Bagh", "Lajpat Nagar", "Lodi Road", "Mandi House", "New Delhi", "Paharganj", "Parliament Street", "Pragati Maidan", "Rajinder Nagar", "Safdarjung", "Sansad Marg", "Sarojini Nagar", "South Extension", "Udyog Bhawan", "Vasant Vihar", "Vinay Marg"], cities: ["Chanakyapuri", "Connaught Place", "Darya Ganj", "Karol Bagh", "Lajpat Nagar", "Lodi Road", "Mandi House", "New Delhi", "Paharganj", "Parliament Street", "Pragati Maidan", "Rajinder Nagar", "Safdarjung", "Sarojini Nagar", "South Extension", "Udyog Bhawan", "Vasant Vihar", "Vinay Marg"] },
  "North Delhi": { blocks: ["Civil Lines", "Derawal Nagar", "Gulabi Bagh", "Kamla Nagar", "Kashmere Gate", "Keshav Puram", "Lajpat Nagar", "Malka Ganj", "Model Town", "Moti Nagar", "New Arif Nagar", "Pitampura", "Rohtak Nagar", "Sarai Rohilla", "Shakti Nagar", "Shastri Nagar", "Shyam Ganj", "Singhpora", "Timarpur", "Tis Hazari", "Vivek Vihar", "Wazirabad", "Yamuna Vihar"], cities: ["Civil Lines", "Derawal Nagar", "Gulabi Bagh", "Kamla Nagar", "Kashmere Gate", "Keshav Puram", "Lajpat Nagar", "Malka Ganj", "Model Town", "Moti Nagar", "New Arif Nagar", "Pitampura", "Rohtak Nagar", "Sarai Rohilla", "Shakti Nagar", "Shastri Nagar", "Shyam Ganj", "Singhpora", "Timarpur", "Tis Hazari", "Vivek Vihar", "Wazirabad", "Yamuna Vihar"] },
  "South Delhi": { blocks: ["Aerocity", "Arjan Garh", "Ashram", "Badarpur", "Bharat Nagar", "Chhatarpur", "Chirag Delhi", "Dabri", "Dakshin Puri", "Delhi Cantt", "Deoli", "Dera Mandi", "Faridabad", "Gautampuri", "Greater Kailash", "Hauz Khas", "Hudson Lines", "Jangpura", "JNU", "Kalka Ji", "Khanpur", "Kotla Mubarakpur", "Kusakheda", "Lajpat Nagar", "Lodhi Colony", "Lodi Estate", "Madangir", "Maharani Bagh", "Malviya Nagar", "Mandi House", "Mangol Puri", "Masoodpur", "Mehrauli", "Molar Band", "Moti Bagh", "Munirka", "Nauroji Nagar", "Nehru Place", "Netaji Nagar", "New Friends Colony", "Okhla", "Panchsheel Park", "Paschim Vihar", "Patel Nagar", "Pragati Maidan", "Pragati Vihar", "Pushp Vihar", "Raj Nagar", "Rajouri Garden", "Rama Krishna Puram", "Rohini", "Safdarjung", "Sainik Farm", "Saket", "Sangam Vihar", "Sarai Kale Khan", "Sarita Vihar", "Seelampur", "Sethi Colony", "Shahdara", "Shahpur Jat", "Shakarpur", "Shastri Park", "Sheikh Sarai", "Sherpur", "Shivalik", "Siri Fort", "Sonia Vihar", "Srinivaspuri", "Sultanpur", "Sunder Nagar", "Tagore Garden", "Tilak Nagar", "Tis Hazari", "Tughlaqabad", "Uttam Nagar", "Vasant Kunj", "Vasant Vihar", "Vijay Mandal Enclave", "Vijay Nagar", "Vikas Puri", "Wazirabad", "Yamuna Bank"], cities: ["Ashram", "Badarpur", "Badkal More", "Batla House", "Bawana", "Chirag Delhi", "Civil Lines", "Dabri", "Dera Mandi", "Dilshad Garden", "Faridabad", "G.T.B. Enclave", "Greater Kailash", "Hauz Khas", "Hauz Rani", "Jamia Nagar", "Janakpuri", "Jangpura", "Jasola", "Kalka Ji", "Kashmere Gate", "Khanpur", "Kotla Mubarakpur", "Lajpat Nagar", "Madangir", "Malviya Nagar", "Mangol Puri", "Mehrauli", "Model Town", "Molar Band", "Nand Nagri", "Nehru Place", "Okhla", "Panchsheel Park", "Paschim Vihar", "Pitampura", "Rajouri Garden", "Rohini", "Saket", "Sarita Vihar", "Seelampur", "Shahdara", "Shastri Nagar", "Sultanpur", "Surajkund", "Tilak Nagar", "Tughlaqabad", "Uttam Nagar", "Vasant Vihar", "Vikaspuri", "Vivek Vihar", "Wazirabad", "Yamuna Vihar", "Zakir Nagar"] },
  // --- Rajasthan ---
  "Alwar": { blocks: ["Alwar", "Bansur", "Behror", "Kishangarh Bas", "Kotkasim", "Lachhmangarh", "Malakhera", "Mundawar", "Rajgarh", "Ramgarh", "Reni", "Shahjahanpur", "Thanagazi", "Tijara", "Weir"], cities: ["Alwar", "Bansur", "Behror", "Kishangarh Bas", "Kotkasim", "Lachhmangarh", "Malakhera", "Mundawar", "Rajgarh", "Ramgarh", "Reni", "Shahjahanpur", "Thanagazi", "Tijara", "Weir"] },
  "Bhilwara": { blocks: ["Asind", "Badi Sadri", "Banera", "Begun", "Bhilwara", "Chhoti Sadri", "Dungla", "Jahazpur", "Kanor", "Kapasan", "Kotri", "Lambiya", "Mandal", "Nathdwara", "Raipur", "Rajsamand", "Rawatbhata", "Rishabhdeo", "Sahada", "Salumbar", "Sangod", "Sarada", "Semari", "Shahpura", "Suwana", "Suwasra", "Takhatgarh", "Udaipur", "Vallabhnagar"], cities: ["Asind", "Badi Sadri", "Banera", "Begun", "Bhilwara", "Chhoti Sadri", "Dungla", "Jahazpur", "Kanor", "Kapasan", "Kotri", "Lambiya", "Mandal", "Nathdwara", "Raipur", "Rajsamand", "Rawatbhata", "Rishabhdeo", "Sahada", "Salumbar", "Sangod", "Sarada", "Semari", "Shahpura", "Suwana", "Suwasra", "Takhatgarh", "Udaipur", "Vallabhnagar"] },
  "Bikaner": { blocks: ["Anupgarh", "Bajju", "Bikaner", "Chhatargarh", "Dungargarh", "Jasrasar", "Khajuwala", "Kolayat", "Kuman", "Lunkaransar", "Nokha", "Poogal", "Pugal", "Rajasamand", "Sri Ganganagar", "Sridungargarh", "Suratgarh", "Taranagar", "Vijaynagar"], cities: ["Anupgarh", "Bajju", "Bikaner", "Chhatargarh", "Dungargarh", "Jasrasar", "Khajuwala", "Kolayat", "Kuman", "Lunkaransar", "Nokha", "Poogal", "Pugal", "Rajasamand", "Sri Ganganagar", "Sridungargarh", "Suratgarh", "Taranagar", "Vijaynagar"] },
  "Sri Ganganagar": { blocks: ["Anupgarh", "Bikaner", "Chhatargarh", "Dungargarh", "Ganganagar", "Gharsana", "Jasrasar", "Karanpur", "Khajuwala", "Kolayat", "Kuman", "Lalgarh", "Lunkaransar", "Nokha", "Padampur", "Poogal", "Pugal", "Raisinghnagar", "Sadulshahar", "Shriganganagar", "Sridungargarh", "Suratgarh", "Taranagar", "Vijaynagar"], cities: ["Anupgarh", "Gharsana", "Karanpur", "Lalgarh", "Padampur", "Raisinghnagar", "Sadulshahar", "Sri Ganganagar", "Suratgarh", "Vijaynagar"] },
  // --- Karnataka ---
  "Bellary": { blocks: ["Bellary", "Hadagali", "Hagaribommanahalli", "Harapanahalli", "Hospet", "Kampli", "Kottur", "Kudligi", "Kurugodu", "Madagiri", "Nagalapur", "Sandur", "Siraguppa", "Siruguppa", "Tekkalakota"], cities: ["Bellary", "Hadagali", "Hagaribommanahalli", "Harapanahalli", "Hospet", "Kampli", "Kottur", "Kudligi", "Kurugodu", "Sandur", "Siruguppa", "Tekkalakota"] },
  "Gulbarga": { blocks: ["Afzalpur", "Aland", "Bhalki", "Bidar", "Chincholi", "Chitapur", "Chitguppa", "Gulbarga", "Homnabad", "Hulsur", "Jevargi", "Kamalapur", "Kamalnagar", "Mauje", "Nanegoan", "Narayanpet", "Sedam", "Shahapur", "Sindgi", "Surpur", "Tadmur", "Taj", "Udchabal", "Venkatapur", "Wadi", "Yadgir"], cities: ["Afzalpur", "Aland", "Bhalki", "Bidar", "Chincholi", "Chitapur", "Gulbarga", "Homnabad", "Hulsur", "Jevargi", "Kamalnagar", "Sedam", "Shahapur", "Wadi", "Yadgir"] },
  "Shimoga": { blocks: ["Bhadravati", "Hosanagara", "Kundapur", "Kundgol", "Shikarpur", "Shimoga", "Sorab", "Thirthahalli"], cities: ["Bhadravati", "Hosanagara", "Kundapur", "Kundgol", "Shikarpur", "Shimoga", "Sorab", "Thirthahalli"] },
  "Udupi": { blocks: ["Barkur", "Brahmavar", "Hebri", "Karkala", "Kaup", "Kundapur", "Udupi"], cities: ["Barkur", "Brahmavar", "Hebri", "Karkala", "Kaup", "Kundapur", "Udupi"] },
  // --- Maharashtra ---
  "Ahmednagar": { blocks: ["Ahmednagar", "Akole", "Jamkhed", "Karjat", "Kopargaon", "Nagar", "Nevasa", "Parner", "Pathardi", "Rahta", "Sangamner", "Sangole", "Shevgaon", "Shrigonda", "Shrirampur", "Velhe"], cities: ["Ahmednagar", "Akole", "Jamkhed", "Karjat", "Kopargaon", "Nevasa", "Parner", "Pathardi", "Rahata", "Sangamner", "Sangole", "Shevgaon", "Shrirampur", "Velhe"] },
  "Raigad": { blocks: ["Alibag", "Karjat", "Khalapur", "Mahad", "Mangaon", "Mhasala", "Murud", "Panvel", "Pen", "Poladpur", "Roha", "Sangameshwar", "Shrivardhan", "Sudhagad", "Tala", "Talasari", "Uran"], cities: ["Alibag", "Karjat", "Khalapur", "Mahad", "Mangaon", "Mhasala", "Murud", "Panvel", "Pen", "Poladpur", "Roha", "Sangameshwar", "Shrivardhan", "Sudhagad", "Tala", "Uran"] },
};

export function AddressSection() {
  // Select values are the plain names, so they round-trip into the lookup
  // tables unchanged. Slugging broke on names containing "and"
  // ("Jammu and Kashmir" -> "Jammu And Kashmir", which matches no key).
  const [stateKey, setStateKey] = useState("");
  const [districtKey, setDistrictKey] = useState("");

  // A district the PIN lookup reported that the bundled table does not carry
  // (renamed or newly carved-out districts). India Post is authoritative for
  // the address being entered, so it joins the options rather than being lost.
  const [extraDistrict, setExtraDistrict] = useState("");

  const availableDistricts = useMemo(() => {
    const base = stateKey ? DISTRICTS_BY_STATE[stateKey] || [] : [];
    if (!extraDistrict || base.some((d) => d.toLowerCase() === extraDistrict.toLowerCase())) {
      return base;
    }
    return [...base, extraDistrict].sort((a, b) => a.localeCompare(b));
  }, [stateKey, extraDistrict]);

  const [blockQuery, setBlockQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [showBlockList, setShowBlockList] = useState(false);
  const [showCityList, setShowCityList] = useState(false);
  const [pincode, setPincode] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [postal, setPostal] = useState<PostalPlace[]>([]);
  const [pinStatus, setPinStatus] = useState<"idle" | "loading" | "found" | "missing">("idle");

  // A PIN code resolves the whole tail of the address, so prefer its data and
  // fall back to the bundled table when the lookup found nothing.
  const places = useMemo(() => {
    if (postal.length > 0) {
      return {
        blocks: uniqueSorted(postal.map((p) => p.block)),
        cities: uniqueSorted(postal.map((p) => p.name)),
      };
    }
    return districtKey
      ? placesByDistrict[districtKey] || { blocks: [], cities: [] }
      : { blocks: [], cities: [] };
  }, [postal, districtKey]);

  // Debounced: fill state / district / block / city / coordinates from the PIN.
  useEffect(() => {
    if (!/^\d{6}$/.test(pincode)) {
      setPostal([]);
      setPinStatus("idle");
      return;
    }
    let cancelled = false;
    setPinStatus("loading");
    const timer = setTimeout(async () => {
      const rows = await lookupPincode(pincode);
      if (cancelled) return;
      setPostal(rows);
      setPinStatus(rows.length > 0 ? "found" : "missing");
      if (rows.length === 0) return;

      const [first] = rows;
      const state = canonicalState(first.state);
      if (INDIAN_STATES.includes(state)) setStateKey(state);
      const reported = first.district.trim();
      const district = (DISTRICTS_BY_STATE[state] || []).find(
        (d) => d.toLowerCase() === reported.toLowerCase()
      );
      if (district) {
        setDistrictKey(district);
      } else if (reported) {
        setExtraDistrict(reported);
        setDistrictKey(reported);
      }

      const blocks = uniqueSorted(rows.map((r) => r.block));
      if (blocks.length === 1) setBlockQuery(blocks[0]);
      if (rows.length === 1) setCityQuery(rows[0].name);

      const point = await geocode(
        `${first.pincode}, ${first.district}, ${first.state}, India`
      );
      if (!cancelled && point) {
        setLatitude(point.lat);
        setLongitude(point.lon);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pincode]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Address Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="address">Street Address *</Label>
          <Textarea id="address" name="address" placeholder="Enter full address" rows={2} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="state">State *</Label>
            <Select
              name="state"
              value={stateKey}
              onValueChange={(val) => {
                setStateKey(val);
                setDistrictKey("");
                setExtraDistrict("");
                setBlockQuery("");
                setCityQuery("");
              }}
            >
              <SelectTrigger id="state">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {INDIAN_STATES.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="district">District *</Label>
            <Select
              name="district"
              value={districtKey}
              disabled={!stateKey || availableDistricts.length === 0}
              onValueChange={(val) => {
                setDistrictKey(val);
                setBlockQuery("");
                setCityQuery("");
              }}
            >
              <SelectTrigger id="district">
                <SelectValue
                  placeholder={stateKey ? "Select district" : "Select state first"}
                />
              </SelectTrigger>
              <SelectContent>
                {availableDistricts.map((district) => (
                  <SelectItem key={district} value={district}>
                    {district}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* Block: typeahead dropdown — only after district is picked */}
        <div className="space-y-2 relative">
          <Label htmlFor="block">Block</Label>
          <Input
            id="block"
            name="block"
            placeholder={
              places.blocks.length > 0 ? "Type to search block" : "Enter block"
            }
            value={blockQuery}
            onChange={(e) => {
              setBlockQuery(e.target.value);
              setShowBlockList(true);
            }}
            onFocus={() => setShowBlockList(true)}
            onBlur={() => setTimeout(() => setShowBlockList(false), 180)}
            autoComplete="off"
          />
          {showBlockList && blockQuery && places.blocks.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 bg-white border rounded-md shadow-lg max-h-44 overflow-y-auto">
              {places.blocks
                .filter((b) => b.toLowerCase().includes(blockQuery.toLowerCase()))
                .map((b) => (
                  <div
                    key={b}
                    className="px-3 py-2 cursor-pointer hover:bg-accent text-sm"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setBlockQuery(b);
                      setShowBlockList(false);
                    }}
                  >
                    {b}
                  </div>
                ))}
            </div>
          )}
        </div>
        {/* City: typeahead dropdown — only after district is picked */}
        <div className="space-y-2 relative">
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            name="city"
            placeholder={
              places.cities.length > 0 ? "Type to search city" : "Enter city"
            }
            value={cityQuery}
            onChange={(e) => {
              setCityQuery(e.target.value);
              setShowCityList(true);
            }}
            onFocus={() => setShowCityList(true)}
            onBlur={() => setTimeout(() => setShowCityList(false), 180)}
            autoComplete="off"
          />
          {showCityList && cityQuery && places.cities.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 bg-white border rounded-md shadow-lg max-h-44 overflow-y-auto">
              {places.cities
                .filter((c) => c.toLowerCase().includes(cityQuery.toLowerCase()))
                .map((c) => (
                  <div
                    key={c}
                    className="px-3 py-2 cursor-pointer hover:bg-accent text-sm"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setCityQuery(c);
                      setShowCityList(false);
                    }}
                  >
                    {c}
                  </div>
                ))}
            </div>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="pincode">Pincode *</Label>
            <Input
              id="pincode"
              name="pincode"
              placeholder="6-digit PIN"
              inputMode="numeric"
              maxLength={6}
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              {pinStatus === "loading" && "Looking up PIN code..."}
              {pinStatus === "found" &&
                "State, district, block, city and coordinates filled from this PIN."}
              {pinStatus === "missing" && "PIN code not found — fill the rest manually."}
              {pinStatus === "idle" && "Enter a PIN to auto-fill the fields above."}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              name="latitude"
              type="number"
              step="any"
              placeholder="e.g., 28.6139"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              name="longitude"
              type="number"
              step="any"
              placeholder="e.g., 77.2090"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Select name="country" defaultValue="india">
            <SelectTrigger id="country">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="india">India</SelectItem>
              <SelectItem value="usa">United States</SelectItem>
              <SelectItem value="uk">United Kingdom</SelectItem>
              <SelectItem value="canada">Canada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
