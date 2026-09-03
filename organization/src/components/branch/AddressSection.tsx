import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";
import { useState, useMemo } from "react";

const states = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const districtsByState: Record<string, string[]> = {
  "Andhra Pradesh": ["Anantapur","Chittoor","East Godavari","Guntur","Krishna","Kurnool","Nellore","Prakasam","Srikakulam","Visakhapatnam","Vizianagaram","West Godavari","YSR Kadapa"],
  "Bihar": ["Araria","Arwal","Aurangabad","Banka","Begusarai","Bhagalpur","Bhojpur","Buxar","Darbhanga","East Champaran","Gaya","Gopalganj","Jamui","Jehanabad","Kaimur","Katihar","Khagaria","Kishanganj","Lakhisarai","Madhepura","Madhubani","Munger","Muzaffarpur","Nalanda","Nawada","Patna","Purnia","Rohtas","Saharsa","Samastipur","Saran","Sheikhpura","Sheohar","Sitamarhi","Siwan","Supaul","Vaishali","West Champaran"],
  "Delhi": ["Central Delhi","East Delhi","New Delhi","North Delhi","North East Delhi","North West Delhi","Shahdara","South Delhi","South East Delhi","South West Delhi","West Delhi"],
  "Gujarat": ["Ahmedabad","Amreli","Anand","Aravalli","Banaskantha","Bharuch","Bhavnagar","Botad","Chhota Udepur","Dahod","Dang","Devbhoomi Dwarka","Gandhinagar","Gir Somnath","Jamnagar","Junagadh","Kheda","Kutch","Mahisagar","Mehsana","Morbi","Narmada","Navsari","Panchmahal","Patan","Porbandar","Rajkot","Sabarkantha","Surat","Surendranagar","Tapi","Vadodara","Valsad"],
  "Karnataka": ["Bagalkot","Bangalore Rural","Bangalore Urban","Belgaum","Bellary","Bidar","Chamarajanagar","Chikballapur","Chikkamagaluru","Chitradurga","Dakshina Kannada","Davanagere","Dharwad","Gadag","Gulbarga","Hassan","Haveri","Kodagu","Kolar","Koppal","Mandya","Mysore","Raichur","Ramanagara","Shimoga","Tumkur","Udupi","Uttara Kannada","Vijayapura","Yadgir"],
  "Maharashtra": ["Ahmednagar","Akola","Amravati","Aurangabad","Beed","Bhandara","Buldhana","Chandrapur","Dhule","Gadchiroli","Gondia","Hingoli","Jalgaon","Jalna","Kolhapur","Latur","Mumbai City","Mumbai Suburban","Nagpur","Nanded","Nandurbar","Nashik","Osmanabad","Palghar","Parbhani","Pune","Raigad","Ratnagiri","Sangli","Satara","Sindhudurg","Solapur","Thane","Wardha","Washim","Yavatmal"],
  "Punjab": ["Amritsar","Barnala","Bathinda","Faridkot","Fatehgarh Sahib","Fazilka","Ferozepur","Gurdaspur","Hoshiarpur","Jalandhar","Kapurthala","Ludhiana","Mansa","Moga","Muktsar","Nawanshahr","Pathankot","Patiala","Rupnagar","Sahibzada Ajit Singh Nagar","Sangrur","Tarn Taran"],
  "Rajasthan": ["Ajmer","Alwar","Banswara","Baran","Barmer","Bharatpur","Bhilwara","Bikaner","Bundi","Chittorgarh","Churu","Dausa","Dholpur","Dungarpur","Hanumangarh","Jaipur","Jaisalmer","Jalore","Jhalawar","Jhunjhunu","Jodhpur","Karauli","Kota","Nagaur","Pali","Pratapgarh","Rajsamand","Sawai Madhopur","Sikar","Sirohi","Sri Ganganagar","Tonk","Udaipur"],
  "Tamil Nadu": ["Ariyalur","Coimbatore","Cuddalore","Dharmapuri","Dindigul","Erode","Kanchipuram","Kanyakumari","Karur","Krishnagiri","Madurai","Nagapattinam","Namakkal","Nilgiris","Perambalur","Pudukkottai","Ramanathapuram","Salem","Sivaganga","Thanjavur","Theni","Thoothukudi","Tiruchirappalli","Tirunelveli","Tiruppur","Tiruvallur","Tiruvannamalai","Tiruvarur","Vellore","Viluppuram","Virudhunagar"],
  "Uttar Pradesh": ["Agra","Aligarh","Allahabad","Ambedkar Nagar","Amethi","Amroha","Auraiya","Azamgarh","Baghpat","Bahraich","Ballia","Balrampur","Banda","Barabanki","Bareilly","Basti","Bhadohi","Bijnor","Budaun","Bulandshahr","Chandauli","Chitrakoot","Deoria","Etah","Etawah","Farrukhabad","Fatehpur","Firozabad","Gautam Buddha Nagar","Ghaziabad","Ghazipur","Gonda","Gorakhpur","Hamirpur","Hapur","Hardoi","Hathras","Jalaun","Jaunpur","Jhansi","Kannauj","Kanpur Dehat","Kanpur Nagar","Kasganj","Kaushambi","Kushinagar","Lakhimpur Kheri","Lalitpur","Lucknow","Maharajganj","Mahoba","Mainpuri","Mathura","Mau","Meerut","Mirzapur","Moradabad","Muzaffarnagar","Pilibhit","Pratapgarh","Raebareli","Rampur","Saharanpur","Sant Kabir Nagar","Sant Ravidas Nagar","Shahjahanpur","Shamli","Shrawasti","Siddharthnagar","Sitapur","Sonbhadra","Sultanpur","Unnao","Varanasi"],
  "West Bengal": ["Alipurduar","Bankura","Birbhum","Cooch Behar","Dakshin Dinajpur","Darjeeling","Hooghly","Howrah","Jalpaiguri","Jhargram","Kalimpong","Kolkata","Maldah","Murshidabad","Nadia","North 24 Parganas","Paschim Bardhaman","Paschim Medinipur","Purba Bardhaman","Purba Medinipur","Purulia","South 24 Parganas","Uttar Dinajpur"],
};

// Practical block/town/city mapping keyed by district slug.
const placesByDistrict: Record<string, { blocks: string[]; cities: string[] }> = {
  // --- Uttar Pradesh ---
  "Agra": { blocks: ["Etmadpur","Kheragarh","Fatehabad","Bah","Khanpur","Agra"], cities: ["Agra","Fatehpur Sikri","Tajganj","Dayalbagh","Kuberpur"] },
  "Aligarh": { blocks: ["Gabhana","Iglas","Hathras","Sikandra Rao","Khair","Atrauli"], cities: ["Aligarh","Hathras","Khair","Sikandra Rao","Atrauli"] },
  "Allahabad": { blocks: ["Koraon","Meja","Soraon","Phulpur","Handia","Bara"], cities: ["Allahabad","Phulpur","Karchana","Handia","Meja"] },
  "Bareilly": { blocks: ["Aonla","Baheri","Faridpur","Nawabganj","Puranpur","Shahganj"], cities: ["Bareilly","Pilibhit","Shahjahanpur","Baheri","Aonla"] },
  "Gautam Buddha Nagar": { blocks: ["Dadri","Jewar","Bisrakh","Surajpur","Noida"], cities: ["Noida","Greater Noida","Dadri","Jewar","Surajpur"] },
  "Ghaziabad": { blocks: ["Ghaziabad","Loni","Muradnagar","Modinagar","Sahibabad","Raj Nagar"], cities: ["Ghaziabad","Loni","Muradnagar","Modinagar","Dasna"] },
  "Gorakhpur": { blocks: ["Campierganj","Chauri Chaura","Khalilabad","Sahjanwa","Bansgaon","Khajni"], cities: ["Gorakhpur","Khalilabad","Sahjanwa","Bansgaon","Chauri Chaura"] },
  "Kanpur Nagar": { blocks: ["Bilhaur","Chaubepur","Ghatampur","Maharajpur","Sarsaul"], cities: ["Kanpur","Chobepur","Ghatampur","Bilhaur","Maharajpur"] },
  "Kanpur Dehat": { blocks: ["Akbarpur","Bhognipur","Malasa","Sandalpur","Wazidpur"], cities: ["Akbarpur","Bhognipur","Rasulabad","Malasa","Sikandra"] },
  "Lucknow": { blocks: ["Bakshi Ka Talab","Malihabad","Mau","Mohanlalganj","Sarojini Nagar"], cities: ["Lucknow","Malihabad","Mau","Bakshi Ka Talab","Gosainganj"] },
  "Mathura": { blocks: ["Chaumuha","Farah","Govardhan","Mat","Nandgaon"], cities: ["Mathura","Vrindavan","Govardhan","Chaumuha","Mahavan"] },
  "Meerut": { blocks: ["Hastinapur","Jani","Karnawal","Kharkhoda","Mawana","Parikshitgarh"], cities: ["Meerut","Hapur","Modinagar","Sardhana","Mawana"] },
  "Moradabad": { blocks: ["Bilari","Dilari","Kanth","Machhrehri","Thakurdwara"], cities: ["Moradabad","Amroha","Sambhal","Bilari","Kanth"] },
  "Muzaffarnagar": { blocks: ["Budhana","Charthawal","Jansath","Kandhla","Khatauli","Shamli"], cities: ["Muzaffarnagar","Shamli","Khatauli","Budhana","Jansath"] },
  "Varanasi": { blocks: ["Araja","Araziline","Chiraigaon","Harahua","Kashi Vidyapeeth","Pindra"], cities: ["Varanasi","Sarnath","Ramnagar","Pindra","Chiraigaon"] },
  "Patna": { blocks: ["Danapur","Dumraon","Hathidah","Masaurhi","Naubatpur","Paliganj","Phulwarisharif","Patna Sadar","Bikram","Maner"], cities: ["Patna","Danapur","Masaurhi","Phulwarisharif","Bikram"] },
  "Bhagalpur": { blocks: ["Bihpur","Gopalpur","Ismailpur","Kharik","Narayanpur","Nathnagar","Pirpainti","Sabour","Sanhaula","Sultanganj"], cities: ["Bhagalpur","Kahalgaon","Naugachhia","Sultanganj","Pirpainti"] },
  "Gaya": { blocks: ["Bodh Gaya","Gaya Town","Gurua","Imamganj","Konch","Manpur","Neemchak Bathani","Paraiya","Sherghati","Tikari"], cities: ["Gaya","Bodh Gaya","Sherghati","Tekari","Wazirganj"] },
  "Muzaffarpur": { blocks: ["Aurai","Baruraj","Bochahan","Gayghat","Kanti","Kurhani","Marhaura","Minapur","Sakra","Saraiya"], cities: ["Muzaffarpur","Motihari","Sitamarhi","Sheohar","Hajipur"] },
  "Darbhanga": { blocks: ["Alinagar","Bahadurpur","Benipur","Biraul","Ghanshyampur","Hanuman Nagar","Keoti","Kusheshwar Asthan","Manigachhi","Singhwara"], cities: ["Darbhanga","Madhubani","Samastipur","Jhanjharpur","Benipur"] },
  "Nawada": { blocks: ["Akbarpur","Bihariganj","Kashi Chak","Meskaur","Nardiganj","Pakri Barawan","Rajoli","Roh","Sirdala","Theka"], cities: ["Nawada","Hisua","Nardiganj","Warisaliganj","Meskaur"] },
  "Saran": { blocks: ["Amnour","Baniapur","Dariapur","Daudnagar","Garkha","Ishupur","Jalalpur","Lakshmipur","Marhaura","Nagra","Panapur","Parsa","Revelganj","Taraiya"], cities: ["Chhapra","Sonepur","Garkha","Marhaura","Revelganj"] },
  "Vaishali": { blocks: ["Bhagwanpur","Bidupur","Chehra Kalan","Desri","Goraul","Hajipur","Jandaha","Lalganj","Mahnar","Mahua","Patedhi Belsar","Patepur","Raghopur","Raja Pakar","Sahdei Buzurg","Vaishali"], cities: ["Hajipur","Lalganj","Mahua","Desri","Raghopur"] },
  "Madhubani": { blocks: ["Andhrathadi","Babhangama","Basauli","Benipatti","Ghoghardiha","Jhanjarpur","Kaluahi","Khutauna","Ladaniya","Lakhnaur","Madhwapur","Pandaul","Phulparas","Rajnagar","Saharsa","Thakurganj"], cities: ["Madhubani","Jhanjarpur","Phulparas","Benipatti","Kaluahi"] },
  // --- Maharashtra ---
  "Mumbai City": { blocks: ["Colaba","Fort","Girgaon","Grant Road","Mazagaon","Malabar Hill","Marine Lines","Chinchpokli","Cotton Green","Byculla","Dadar","Matunga","Wadala","Parel","Sion","Dharavi","Antop Hill","Sewri","Worli","Lower Parel"], cities: ["Mumbai South","Colaba","Marine Lines","Fort","Malabar Hill"] },
  "Mumbai Suburban": { blocks: ["Andheri","Borivali","Dahisar","Goregaon","Jogeshwari","Juhu","Kandivali","Khar","Malad","Santacruz","Vile Parle","Bandra","Mahim","Worli","Dadar","Parel","Powai","Chembur","Ghatkopar","Kurla"], cities: ["Bandra","Andheri","Borivali","Powai","Chembur","Malad","Goregaon","Kurla","Vile Parle","Juhu"] },
  "Pune": { blocks: ["Pune City","Haveli","Maval","Mulshi","Bhor","Velhe","Purandhar","Indapur","Daund","Shirur","Ambegaon","Junnar","Akole","Sangamner","Kopargaon","Rahata","Shrirampur","Nevasa","Shevgaon","Pathardi"], cities: ["Pune","Pimpri-Chinchwad","Lonavala","Talegaon","Saswad","Daund","Shirur","Baramati","Indapur","Junnar"] },
  "Nagpur": { blocks: ["Nagpur Urban","Nagpur Rural","Ramtek","Kalmeshwar","Parseoni","Kamptee","Hingna","Umred","Bhiwapur","Mauda","Kuhi","Savner","Narkhed","Katol","Narkhed"], cities: ["Nagpur","Kamptee","Umred","Ramtek","Hingna","Savner","Kalmeshwar","Katol"] },
  "Thane": { blocks: ["Thane","Kalyan","Ulhasnagar","Ambarnath","Badlapur","Dombivli","Mira-Bhayandar","Bhiwandi","Shahapur","Murbad","Wada","Vikramgad","Palghar","Vasai","Nallasopara"], cities: ["Thane","Kalyan","Dombivli","Ulhasnagar","Badlapur","Mira Road","Bhiwandi","Palghar","Vasai","Nallasopara"] },
  "Nashik": { blocks: ["Nashik","Igatpuri","Trimbakeshwar","Baglan","Malegaon","Nandgaon","Chandwad","Dindori","Peint","Surgana","Yeola","Niphad","Sinnar"], cities: ["Nashik","Malegaon","Sinnar","Yeola","Niphad","Dindori","Trimbak","Igatpuri"] },
  "Aurangabad": { blocks: ["Aurangabad","Kannad","Soegaon","Gangapur","Vaijapur","Phulambri","Khuldabad","Sillod","Paithan","Lasur","Palthan","Shevgaon"], cities: ["Aurangabad","Jalna","Paithan","Sillod","Vaijapur","Kannad","Phulambri","Gangapur"] },
  "Solapur": { blocks: ["Barshi","Karmala","Madha","Mangalvedhe","Mohol","North Solapur","Pandharpur","Sangole","South Solapur","Akkalkot"], cities: ["Solapur","Pandharpur","Barshi","Karmala","Mohol","Akkalkot","Mangalwedha"] },
  // --- Gujarat ---
  "Ahmedabad": { blocks: ["Ahmedabad City","Daskroi","Detroj-Rampura","Dhandhuka","Dholka","Mandal","Sanand","Viramgam","Bavla","Dholera","Matar","Petlad"], cities: ["Ahmedabad","Sanand","Dholka","Viramgam","Bavla","Dhandhuka","Detroj"] },
  "Surat": { blocks: ["Surat City","Chorasi","Olpad","Mahuva","Mandvi","Bardoli","Palsana","Kamrej","Choryasi"], cities: ["Surat","Navsari","Bardoli","Mandvi","Olpad","Mahuva","Kamrej"] },
  "Vadodara": { blocks: ["Vadodara City","Dabhoi","Desar","Karjan","Padra","Savli","Sinor","Waghodia"], cities: ["Vadodara","Karjan","Dabhoi","Padra","Waghodia","Desar","Savli"] },
  "Rajkot": { blocks: ["Rajkot City","Gondal","Dhoraji","Upleta","Jamkandorna","Jetpur","Lodhika","Paddhari","Rapar"], cities: ["Rajkot","Gondal","Dhoraji","Upleta","Jetpur","Jamkandorna"] },
  "Bhavnagar": { blocks: ["Bhavnagar City","Gariadhar","Palitana","Sihor","Talaja","Umrala","Vallabhipur"], cities: ["Bhavnagar","Palitana","Sihor","Gariadhar","Talaja","Vallabhipur"] },
  "Jamnagar": { blocks: ["Jamnagar City","Dhrol","Jam Kandorna","Jodiya","Kalavad","Khambhaliya","Lalpur","Okhamandal"], cities: ["Jamnagar","Porbandar","Khambhaliya","Dhrol","Jodiya","Okha"] },
  "Junagadh": { blocks: ["Junagadh City","Bhesana","Junagadh","Keshod","Malia","Mendarda","Vanthali","Visavadar"], cities: ["Junagadh","Porbandar","Keshod","Vanthali","Visavadar","Mendarda"] },
  "Kutch": { blocks: ["Bhuj","Bhachau","Mandvi","Mundra","Nakhatrana","Rapar","Lakhpat","Abdasa"], cities: ["Bhuj","Gandhidham","Anjar","Bhachau","Mandvi","Mundra","Rapar"] },
  // --- Karnataka ---
  "Bangalore Urban": { blocks: ["Bangalore East","Bangalore North","Bangalore South","Anekal","Yelahanka","Dasarahalli","Kengeri","Rajajinagar","Mahadevapura","Bommanahalli"], cities: ["Bangalore","Yelahanka","Anekal","Kengeri","Electronic City","Whitefield","Jayanagar"] },
  "Bangalore Rural": { blocks: ["Devanahalli","Dod Ballapur","Hoskote","Magadi","Nelamangala","Anekal","Channapatna","Kanakapura","Ramanagara"], cities: ["Devanahalli","Dod Ballapur","Hoskote","Magadi","Nelamangala","Channapatna"] },
  "Mysore": { blocks: ["Mysore","Hunsur","Krishnarajanagara","H.D.Kote","Gundlupet","T.Narsipur","Piriyapatna","Nanjangud","Bettahalli","Saligrama"], cities: ["Mysore","Hunsur","Krishnarajanagara","Nanjangud","Gundlupet","Piriyapatna"] },
  "Belgaum": { blocks: ["Belgaum","Bailhongal","Saundatti","Ramdurg","Khanapur","Bageshwar","Chikkodi","Hukeri","Raybag","Athani","Kagawad"], cities: ["Belgaum","Bailhongal","Saundatti","Chikkodi","Athani","Hukeri","Raybag"] },
  "Mangalore": { blocks: ["Mangalore","Bantwal","Beltangady","Puttur","Sulya","Moodabidri","Kadaba","Belthangadi"], cities: ["Mangalore","Udupi","Karkala","Moodabidri","Puttur","Bantwal","Sulya"] },
  // --- Tamil Nadu ---
  "Chennai": { blocks: ["Ambattur","Aminjikarai","Ayanavaram","Egmore","Guindy","Madhavaram","Mylapore","Perambur","Tondiarpet","Velachery","Adyar","Mambalam","Saidapet","Sholinganallur","Tambaram","Avadi","Poonamallee"], cities: ["Chennai","Guindy","Tambaram","Avadi","Poonamallee","Madhavaram","Perambur","Ambattur","Velachery"] },
  "Coimbatore": { blocks: ["Coimbatore North","Coimbatore South","Annur","Kinathukadavu","Madukkarai","Mettupalayam","Sulur","Thondamuthur","Valparai"], cities: ["Coimbatore","Mettupalayam","Pollachi","Valparai","Annur","Sulur","Kinathukadavu"] },
  "Madurai": { blocks: ["Madurai East","Madurai West","Madurai North","Madurai South","Thiruparankundram","Tirumangalam","Usilampatti","Peraiyur","Sedapatti","Chekkurani"], cities: ["Madurai","Tirumangalam","Usilampatti","Peraiyur","Melur","Vadipatti","Thirumangalam"] },
  "Salem": { blocks: ["Salem East","Salem West","Salem North","Salem South","Yercaud","Attayampatti","Konganapuram","Mecheri","Omalur","Panaimarathupatti","Sankari","Veerapandi","Vazhapadi"], cities: ["Salem","Yercaud","Attayampatti","Mecheri","Omalur","Konganapuram"] },
  "Tiruchirappalli": { blocks: ["Tiruchirappalli East","Tiruchirappalli West","Lalgudi","Manachanallur","Manapparai","Musiri","Thiruverumbur","Thottiyam","Thuraiyur","Uppiliapuram"], cities: ["Tiruchirappalli","Thanjavur","Karur","Musiri","Manapparai","Thiruverumbur","Lalgudi"] },
  // --- West Bengal ---
  "Kolkata": { blocks: ["Ballygunge","Beleghata","Burrabazar","Entally","Garden Reach","Jadavpur","Kolkata Port","Kasba","Maniktala","Moula Ali","Park Street","Sealdah","Shyampukur","Tollygunge","Topsia","Ward 1","Ward 2","Ward 3","Ward 4","Ward 5","Ward 6","Ward 7","Ward 8","Ward 9","Ward 10","Ward 11","Ward 12","Ward 13","Ward 14","Ward 15","Ward 16","Ward 17","Ward 18","Ward 19","Ward 20"], cities: ["Kolkata","Salt Lake","New Town","Howrah","Baranagar","Dum Dum","Bally","Rajarahat","Madhyamgram","Barasat","Tollygunge","Alipore","Bhowanipore","Maidan","Burrabazar","Entally"] },
  "Howrah": { blocks: ["Amta I","Amta II","Bally Jagachha","Bagnan I","Bagnan II","Domjur","Jagatballavpur","Jangipara","Panchla","Sankrail","Shyampur I","Shyampur II","Uluberia I","Uluberia II","Uluberia"], cities: ["Howrah","Uluberia","Bally","Domjur","Bagnan","Amta","Jagatballavpur","Sankrail","Panchla","Shyampur"] },
  "North 24 Parganas": { blocks: ["Baduria","Bagdah","Barasat I","Barasat II","Barrackpore I","Barrackpore II","Basirhat I","Basirhat II","Bongaon","Deganga","Gaighata","Habra I","Habra II","Haringhata","Haroa","Hasnabad","Minakhan","Rajarhat","Sandeshkhali I","Sandeshkhali II"], cities: ["Barasat","Bongaon","Basirhat","Habra","Taki","Bangaon","Barrackpore","Naihati","Bhatpara","Kalyani","Bidhannagar","Madhyamgram","Rajarhat","Ashoknagar","Deganga","Haroa"] },
  "South 24 Parganas": { blocks: ["Alipore","Baruipur","Basanti","Bhangar I","Bhangar II","Bishnupur I","Bishnupur II","Budge Budge I","Budge Budge II","Canning I","Canning II","Diamond Harbour I","Diamond Harbour II","Falta","Gosaba","Jadabpur","Jaynagar I","Jaynagar II","Kakdwip","Kulpi","Magrahat I","Magrahat II","Mandirbazar","Mathurapur I","Mathurapur II","Moung","Patharpratima","Sagar","Sonarpur","Canning"], cities: ["Kolkata","Alipore","Baruipur","Diamond Harbour","Canning","Jaynagar","Basanti","Magrahat","Budge Budge","Bhangar","Falta","Kulpi","Patharpratima","Sagar","Gosaba","Mathurapur","Sonarpur","Moung","Tilpi","Harinbari"] },
  "East Midnapore": { blocks: ["Bhagabanpur I","Bhagabanpur II","Chandipur","Contai I","Contai II","Contai III","Deshapran","Egra I","Egra II","Khejuri I","Khejuri II","Moyna","Nandakumar","Panskura I","Panskura II","Purba Medinipur","Ramnagar I","Ramnagar II","Sahid Matangini","Tamluk","Potashpur"], cities: ["Tamluk","Contai","Egra","Nandakumar","Bhagabanpur","Ramnagar","Panskura","Mahishadal","Moyna","Khejuri","Deshapran","Sahid Matangini"] },
  "West Midnapore": { blocks: ["Dantan I","Dantan II","Daspur I","Daspur II","Debra","Ghatal","Gobindapur","Jamboni","Jhargram","Keshiari","Kharagpur I","Kharagpur II","Keshpur","Narayangarh","Pingla","Sabang","Salboni","Sankrail","Sarenga","Midnapore Sadar"], cities: ["Kharagpur","Midnapore","Ghatal","Jhargram","Dantan","Daspur","Sabang","Salboni","Narayangarh","Keshiari","Debra","Pingla"] },
  "Hooghly": { blocks: ["Arambagh","Balagarh","Chanditala I","Chanditala II","Chinsurah-Magra","Dhaniakhali","Goghat I","Goghat II","Haripal","Jagatballavpur","Khanakul I","Khanakul II","Mogra","Pandua","Polba-Dadpur","Pursurah","Serampore Uttarpara","Singur","Tarakeswar"], cities: ["Serampore","Chinsurah","Bandel","Hooghly","Chandannagar","Rishra","Bally","Dankuni","Singur","Tarakeswar","Arambagh","Pursurah","Dhaniakhali","Pandua","Haripal","Polba"] },
  "Nadia": { blocks: ["Chakdaha","Chapra","Hanskhali","Haringhata","Kaliganj","Karimpur I","Karimpur II","Krishnaganj","Krishnapur","Nabadwip","Nakashipara","Plassey","Ranaghat I","Ranaghat II","Santipur","Sabad Krishnapur","Tehatta I","Tehatta II","",""], cities: ["Krishnanagar","Ranaghat","Santipur","Nabadwip","Kalyani","Chakdaha","Karimpur","Tehatta","Haringhata","Plassey","Krishnaganj","Nakashipara"] },
  // --- Bihar ---
  "Patna": { blocks: ["Danapur","Dumraon","Hathidah","Masaurhi","Naubatpur","Paliganj","Phulwarisharif","Patna Sadar","Bikram","Maner","Fatwah","Sampatchak","Bikramganj","Nur Nagar","Khusrupur"], cities: ["Patna","Danapur","Masaurhi","Phulwarisharif","Bikram","Paliganj","Maner","Fatwah","Khusrupur","Nur Nagar"] },
  "Bhagalpur": { blocks: ["Bihpur","Gopalpur","Ismailpur","Kharik","Narayanpur","Nathnagar","Pirpainti","Sabour","Sanhaula","Sultanganj","Kahalgaon","Naugachhia"], cities: ["Bhagalpur","Kahalgaon","Naugachhia","Sultanganj","Pirpainti","Kharik","Gopalpur"] },
  "Gaya": { blocks: ["Bodh Gaya","Gaya Town","Gurua","Imamganj","Konch","Manpur","Neemchak Bathani","Paraiya","Sherghati","Tikari","Wazirganj","Amas","Banke Bazar","Dobhi","Dumaria","Fatehpur","Ghelhu","Goriyakothi","Kaler","Kochas","Konch","Manpur","Mohanpur","Nauhatta","Nawada","Pakri Barawan","Paraiya","Rajpur","Roh","Shahpur","Sherghati","Sikandra","Tikari","Wazirganj"], cities: ["Gaya","Bodh Gaya","Sherghati","Tekari","Wazirganj","Neemchak Bathani","Amas","Konch","Banke Bazar","Gurua","Paraiya","Tikari","Fatehpur","Dobhi","Dumaria","Kaler","Kochas","Manpur","Mohanpur","Nawada","Rajpur","Roh","Shahpur","Sikandra"] },
  "Muzaffarpur": { blocks: ["Aurai","Baruraj","Bochahan","Gayghat","Kanti","Kurhani","Marhaura","Minapur","Sakra","Saraiya","Gaighat","Lalganj","Mahnar","Mahua","Patepur","Raghopur","Rajapakar","Sahdei Buzurg","Vaishali","Desri","Hajipur","Jandaha","Lalganj","Patedhi Belsar","Sahdei Buzurg"], cities: ["Muzaffarpur","Motihari","Sitamarhi","Sheohar","Hajipur","Lalganj","Mahua","Desri","Raghopur","Patepur","Vaishali","Jandaha","Patedhi Belsar","Sahdei Buzurg","Baruraj","Bochahan","Sakra","Saraiya","Kurhani","Kanti","Gaighat","Aurai","Gayghat","Minapur","Mahnar","Mahua","Rajapakar","Mahnar","Marhaura"] },
  "Saran": { blocks: ["Amnour","Baniapur","Dariapur","Daudnagar","Garkha","Ishupur","Jalalpur","Lakshmipur","Marhaura","Nagra","Panapur","Parsa","Revelganj","Taraiya","Chapra","Sonepur","Dighwara","Manjhi","Nayagaon","Patna"], cities: ["Chhapra","Sonepur","Garkha","Marhaura","Revelganj","Dariapur","Baniapur","Taraiya","Panapur","Parsa","Nagra","Jalalpur","Amnour","Ishupur","Lakshmipur","Daudnagar"] },
  "Darbhanga": { blocks: ["Alinagar","Bahadurpur","Benipur","Biraul","Ghanshyampur","Hanuman Nagar","Keoti","Kusheshwar Asthan","Manigachhi","Singhwara","Jhanjharpur","Madhubani","Benipatti","Phulparas","Ladania","Kaluahi","Ghoghardiha","Andhrathadi","Babhangama","Basauli","Khadauwan","Lakhnaur","Madhwapur","Pandaul","Rajnagar","Thakurganj"], cities: ["Darbhanga","Madhubani","Jhanjharpur","Benipatti","Phulparas","Kaluahi","Ghoghardiha","Andhrathadi","Babhangama","Basauli","Khadauwan","Lakhnaur","Madhwapur","Pandaul","Rajnagar","Thakurganj"] },
  "West Champaran": { blocks: ["Bagaha","Bettiah","Bodh Gaya","Chanpatia","Gaunaha","Harsidhi","Lauriya","Madhuban","Mainatand","Narkatiaganj","Nawabganj","Ramnagar","Sikta","Valmiki Nagar","Dhaka","Jogapatti","Lauriya Nandangarh","Nautan","Pawai","Sidhaw","Sugauli","Tetaria"], cities: ["Bettiah","Bagaha","Narkatiaganj","Sugauli","Ramnagar","Nautan","Lauriya","Chanpatia","Harsidhi","Bodh Gaya","Dhaka","Jogapatti","Lauriya Nandangarh","Pawai","Sidhaw","Tetaria","Valmiki Nagar","Gaunaha","Madhuban","Mainatand","Nawabganj","Sikta"] },
  "East Champaran": { blocks: ["Adapur","Areraj","Banjaria","Bankatwa","Chakia","Chiraia","Dhaka","Kesaria","Kotwa","Madhuban","Mehsi","Motihari","Nagra","Paharpur","Pipra","Purba Champaran","Raxaul","Sangrampur","Sikta","Sugauli","Tetaria","Turkaulia"], cities: ["Motihari","Mehsi","Raxaul","Sugauli","Adapur","Areraj","Chakia","Chiraia","Dhaka","Kesaria","Kotwa","Nagra","Paharpur","Pipra","Purba Champaran","Sangrampur","Sikta","Tetaria","Turkaulia","Banjar","Bankatwa","Madhuban"] },
  // --- Rajasthan ---
  "Jaipur": { blocks: ["Amber","Bassi","Chaksu","Chomu","Dudu","Jaipur","Jamwa Ramgarh","Kotputli","Phagi","Sanganer","Shahpura","Viratnagar"], cities: ["Jaipur","Sanganer","Amber","Bassi","Chomu","Dudu","Jamwa Ramgarh","Kotputli","Phagi","Shahpura","Viratnagar"] },
  "Jodhpur": { blocks: ["Balesar","Bhopalgarh","Jodhpur","Luni","Osian","Phalodi","Shergarh","Bilara"], cities: ["Jodhpur","Pali","Phalodi","Osian","Bilara","Balesar","Luni","Shergarh","Bhopalgarh"] },
  "Kota": { blocks: ["Kota","Ramganj Mandi","Digod","Pipalda","Sangod","Suket","Chhabra","Atru","Baran","Anta","Chhipabarod","Chhabra","Digod","Mangrol","Nainwa","Pipalda","Ramganj Mandi","Sangod","Suket"], cities: ["Kota","Baran","Bundi","Ramganj Mandi","Sangod","Digod","Suket","Chhabra","Atru","Anta"] },
  "Udaipur": { blocks: ["Badgaon","Bhinder","Girwa","Gogunda","Jhadol","Kotra","Lasadiya","Mavli","Rishabhdeo","Salumbar","Semari","Sarada","Sukher","Udaipur","Vallabhnagar"], cities: ["Udaipur","Nathdwara","Salumbar","Girwa","Mavli","Vallabhnagar","Semari","Sarada","Rishabhdeo","Kotra","Jhadol"] },
  "Ajmer": { blocks: ["Ajmer","Arain","Bhinai","Bhilwara","Hurda","Jaitaran","Kekri","Kishangarh","Masuda","Nasirabad","Peeplu","Pushkar","Sarwar","Todaraisingh","Vijainagar"], cities: ["Ajmer","Kishangarh","Nasirabad","Pushkar","Todaraisingh","Vijainagar","Masuda","Kekri","Sarwar"] },
  // --- Punjab ---
  "Ludhiana": { blocks: ["Ludhiana East","Ludhiana West","Jagraon","Khanna","Raikot","Samrala","Malaudh","Payal","Killa Raipur","Machhiwara","Sudhar","Vill","Dehlon","Doraha","Dudhansu Kalan","Gurusar Sudhar","Jodhan","Kang","Khamano","Kot Ise Khan","Latala","Machhiwara","Mangat","Nurmahal","Rakhra","Rampur","Samrala","Talwandi Rai","Thikriwal"], cities: ["Ludhiana","Jagraon","Khanna","Raikot","Samrala","Malaudh","Payal","Killa Raipur","Machhiwara","Sudhar","Dehlon","Doraha","Dudhansu Kalan","Gurusar Sudhar","Jodhan","Kang","Khamano","Kot Ise Khan","Latala","Mangat","Nurmahal","Rakhra","Rampur","Talwandi Rai","Thikriwal","Vill"] },
  "Amritsar": { blocks: ["Amritsar","Ajnala","Attari","Baba Bakala","Chogawan","Darsibaba","Dharamkot","Jandiala Guru","Khadur Sahib","Majitha","Patti","Rayya","Tarn Taran","Verka","Zira"], cities: ["Amritsar","Tarn Taran","Khadoor Sahib","Patti","Ajnala","Baba Bakala","Rayya","Majitha","Jandiala Guru","Verka","Attari","Chogawan","Darsibaba","Dharamkot","Zira"] },
  "Jalandhar": { blocks: ["Adampur","Jalandhar East","Jalandhar West","Jalandhar North","Jalandhar South","Bhogpur","Nakodar","Phillaur","Shahkot","Baba Bakala","Lohian Khas","Sultanpur Lodhi","Talwandi Chaudhrian","Urmar Tanda"], cities: ["Jalandhar","Nakodar","Phillaur","Shahkot","Bhogpur","Adampur","Lohian Khas","Sultanpur Lodhi","Urmar Tanda","Talwandi Chaudhrian"] },
  "Patiala": { blocks: ["Patiala","Nabha","Rajpura","Samana","Ghanaur","Nabha","Patiala","Rajpura","Samana","Banur","Bhunerheri","Chungharh","Derabassi","Dhilwan","Gharachon","Gill","Jhandian","Kartarpur","Kotla Nihang","Kultham","Lehragaga","Malerkotla","Moonak","Nabha","Nangal","Patran","Rakhra","Rajpura","Samana","Sanaur","Sirhind","Sohana","Tapa","Urban Estate","Urban Estate Phase I","Urban Estate Phase II","Urban Estate Phase III"], cities: ["Patiala","Rajpura","Nabha","Samana","Banur","Derabassi","Ghanaur","Lehragaga","Malerkotla","Moonak","Patran","Sirhind","Tapa","Sanaur"] },
  // --- Andhra Pradesh ---
  "Visakhapatnam": { blocks: ["Anandapuram","Anakapalle","Bheemunipatnam","Chodavaram","Gajuwaka","Gopalapatnam","Kotauratla","Madugula","Munagapaka","Nakkapalli","Narsipatnam","Pedagantyada","Pendurthi","Rambilli","Sabbavaram","Seethammadhara","Srungavarapukota","Vepagunta","Visakhapatnam"], cities: ["Visakhapatnam","Anakapalle","Vizag","Gajuwaka","Bheemunipatnam","Narsipatnam","Chodavaram","Madugula","Nakkapalli","Pedagantyada","Pendurthi","Rambilli","Sabbavaram","Seethammadhara","Srungavarapukota","Vepagunta","Anandapuram","Kotauratla","Munagapaka","Narsipatnam","Pedagantyada","Rambilli","Sabbavaram"] },
  "Vijayawada": { blocks: ["Vijayawada","Gannavaram","Kankipadu","Penamaluru","Thotlavalluru","Vuyyuru","Bapulapadu","Nandivada","Mylavaram","Reddigudem","Ibrahimpatnam","Kondapalli","Mopidevi","Movva","Nagayalanka","Pamarru","Pedaparupudi","Thotlavalluru","Unguturu","Veerullapadu"], cities: ["Vijayawada","Guntur","Tenali","Mangalagiri","Tadepalligudem","Narasaraopet","Sattenapalle","Repalle","Tenali","Bapatla","Ponnur","Vinukonda","Chilakaluripet","Macherla","Dachepalle","Narasaraopet","Sattenapalle","Vinukonda","Chilakaluripet","Macherla","Dachepalle"] },
  "Guntur": { blocks: ["Guntur","Mangalagiri","Tadikonda","Thulluru","Duggirala","Kollipara","Nekarikallu","Pedakurapadu","Rajupalem","Sattenapalle","Tadepalle","Tenali","Vatticherukuru","Vemuru","Bapatla","Cherukupalle","Karlapalem","Kollur","Nadendla","Nekarikallu","Pedakurapadu","Rajupalem","Sattenapalle","Tadepalle","Tenali","Vatticherukuru","Vemuru"], cities: ["Guntur","Mangalagiri","Tenali","Tadepalligudem","Narasaraopet","Sattenapalle","Repalle","Bapatla","Ponnur","Vinukonda","Chilakaluripet","Macherla","Dachepalle"] },
  // --- Delhi ---
  "New Delhi": { blocks: ["Chanakyapuri","Connaught Place","Delhi Cantonment","Darya Ganj","Karol Bagh","Lajpat Nagar","Lodi Road","Mandi House","New Delhi","Paharganj","Parliament Street","Pragati Maidan","Rajinder Nagar","Safdarjung","Sansad Marg","Sarojini Nagar","South Extension","Udyog Bhawan","Vasant Vihar","Vinay Marg"], cities: ["New Delhi","Connaught Place","Lajpat Nagar","Chanakyapuri","Darya Ganj","Karol Bagh","Safdarjung","Parliament Street","Pragati Maidan","Rajinder Nagar","Sarojini Nagar","South Extension","Udyog Bhawan","Vasant Vihar","Vinay Marg","Mandi House","Paharganj","Lodi Road"] },
  "North Delhi": { blocks: ["Civil Lines","Derawal Nagar","Gulabi Bagh","Kamla Nagar","Kashmere Gate","Keshav Puram","Lajpat Nagar","Malka Ganj","Model Town","Moti Nagar","New Arif Nagar","Pitampura","Rohtak Nagar","Sarai Rohilla","Shakti Nagar","Shastri Nagar","Shyam Ganj","Singhpora","Timarpur","Tis Hazari","Vivek Vihar","Wazirabad","Yamuna Vihar"], cities: ["Civil Lines","Model Town","Kamla Nagar","Shastri Nagar","Pitampura","Keshav Puram","Kashmere Gate","Wazirabad","Yamuna Vihar","Derawal Nagar","Gulabi Bagh","Malka Ganj","Moti Nagar","New Arif Nagar","Rohtak Nagar","Sarai Rohilla","Shakti Nagar","Shyam Ganj","Singhpora","Timarpur","Tis Hazari","Vivek Vihar","Lajpat Nagar"] },
  "South Delhi": { blocks: ["Aerocity","Arjan Garh","Ashram","Badarpur","Bharat Nagar","Chhatarpur","Chirag Delhi","Dabri","Dakshin Puri","Delhi Cantt","Dera Mandi","Deoli","Faridabad","Gautampuri","Greater Kailash","Hauz Khas","Hudson Lines","Jangpura","JNU","Kalka Ji","Khanpur","Kotla Mubarakpur","Kusakheda","Lajpat Nagar","Lodhi Colony","Lodi Estate","Madangir","Maharani Bagh","Malviya Nagar","Mandi House","Mangol Puri","Masoodpur","Mehrauli","Molar Band","Moti Bagh","Munirka","Nauroji Nagar","New Friends Colony","Nehru Place","Netaji Nagar","Okhla","Panchsheel Park","Paschim Vihar","Patel Nagar","Pragati Maidan","Pragati Vihar","Pushp Vihar","Raj Nagar","Rajouri Garden","Rama Krishna Puram","Rohini","Safdarjung","Sainik Farm","Saket","Sangam Vihar","Sarai Kale Khan","Sarita Vihar","Seelampur","Sethi Colony","Shahdara","Shahpur Jat","Shakarpur","Shastri Park","Sheikh Sarai","Sherpur","Shivalik","Siri Fort","Sonia Vihar","Srinivaspuri","Sultanpur","Sunder Nagar","Tagore Garden","Tilak Nagar","Tis Hazari","Tughlaqabad","Uttam Nagar","Vasant Kunj","Vasant Vihar","Vijay Mandal Enclave","Vikas Puri","Vijay Nagar","Wazirabad","Yamuna Bank"], cities: ["Hauz Khas","Saket","Mehrauli","Malviya Nagar","Greater Kailash","Vasant Vihar","Nehru Place","Panchsheel Park","Lajpat Nagar","Ashram","Kalka Ji","Chirag Delhi","Jangpura","Khanpur","Okhla","Sarita Vihar","Madangir","Molar Band","Dabri","Rajouri Garden","Tilak Nagar","Paschim Vihar","Uttam Nagar","Vikaspuri","Janakpuri","Pitampura","Rohini","Shastri Nagar","Model Town","Wazirabad","Yamuna Vihar","Civil Lines","Kashmere Gate","Shahdara","Seelampur","Dilshad Garden","G.T.B. Enclave","Vivek Vihar","Nand Nagri","Bawana","Mangol Puri","Sultanpur","Badarpur","Tughlaqabad","Faridabad","Dera Mandi","Chirag Delhi","Hauz Rani","Kotla Mubarakpur","Jamia Nagar","Zakir Nagar","Batla House","Jasola","Sarita Vihar","Badkal More","Surajkund"] },
  // --- Rajasthan ---
  "Alwar": { blocks: ["Alwar","Bansur","Behror","Kishangarh Bas","Kotkasim","Lachhmangarh","Malakhera","Mundawar","Rajgarh","Ramgarh","Reni","Shahjahanpur","Thanagazi","Tijara","Weir"], cities: ["Alwar","Behror","Kishangarh Bas","Tijara","Rajgarh","Ramgarh","Bansur","Mundawar","Malakhera","Lachhmangarh","Kotkasim","Reni","Shahjahanpur","Thanagazi","Weir"] },
  "Bhilwara": { blocks: ["Bhilwara","Asind","Banera","Mandal","Shahpura","Jahazpur","Kotri","Raipur","Sahada","Suwana","Badi Sadri","Begun","Chhoti Sadri","Dungla","Kapasan","Kanor","Lambiya","Nathdwara","Rajsamand","Rawatbhata","Rishabhdeo","Salumbar","Sangod","Semari","Sarada","Suwasra","Takhatgarh","Udaipur","Vallabhnagar"], cities: ["Bhilwara","Shahpura","Kotri","Mandal","Asind","Banera","Jahazpur","Raipur","Sahada","Suwana","Badi Sadri","Begun","Chhoti Sadri","Dungla","Kapasan","Kanor","Lambiya","Nathdwara","Rajsamand","Rawatbhata","Rishabhdeo","Salumbar","Sangod","Semari","Sarada","Suwasra","Takhatgarh","Udaipur","Vallabhnagar"] },
  "Bikaner": { blocks: ["Bikaner","Anupgarh","Bajju","Bikaner","Chhatargarh","Dungargarh","Jasrasar","Khajuwala","Kolayat","Kuman","Lunkaransar","Nokha","Poogal","Pugal","Rajasamand","Sridungargarh","Sri Ganganagar","Suratgarh","Taranagar","Vijaynagar"], cities: ["Bikaner","Anupgarh","Bajju","Chhatargarh","Dungargarh","Jasrasar","Khajuwala","Kolayat","Kuman","Lunkaransar","Nokha","Poogal","Pugal","Rajasamand","Sridungargarh","Sri Ganganagar","Suratgarh","Taranagar","Vijaynagar"] },
  "Sri Ganganagar": { blocks: ["Anupgarh","Ganganagar","Gharsana","Karanpur","Raisinghnagar","Sadulshahar","Shriganganagar","Suratgarh","Vijaynagar","Padampur","Lalgarh","Bikaner","Chhatargarh","Dungargarh","Jasrasar","Khajuwala","Kolayat","Kuman","Lunkaransar","Nokha","Poogal","Pugal","Sridungargarh","Taranagar"], cities: ["Sri Ganganagar","Anupgarh","Karanpur","Raisinghnagar","Sadulshahar","Gharsana","Padampur","Lalgarh","Suratgarh","Vijaynagar"] },
  // --- Karnataka ---
  "Belgaum": { blocks: ["Belgaum","Bailhongal","Saundatti","Ramdurg","Khanapur","Bageshwar","Chikkodi","Hukeri","Raybag","Athani","Kagawad","Nippani","Gokak","Mudalagi","Mugalkhod","Ramdurg","Saundatti","Yaragatti"], cities: ["Belgaum","Bailhongal","Saundatti","Ramdurg","Khanapur","Chikkodi","Athani","Hukeri","Raybag","Gokak","Nippani","Kagawad","Mudalagi","Mugalkhod","Yaragatti"] },
  "Bellary": { blocks: ["Bellary","Hospet","Sandur","Siruguppa","Kudligi","Hadagali","Hagaribommanahalli","Harapanahalli","Kottur","Madagiri","Nagalapur","Tekkalakota","Kampli","Kurugodu","Siraguppa","Bellary"], cities: ["Bellary","Hospet","Sandur","Siruguppa","Kudligi","Hadagali","Hagaribommanahalli","Harapanahalli","Kottur","Tekkalakota","Kampli","Kurugodu"] },
  "Gulbarga": { blocks: ["Gulbarga","Afzalpur","Aland","Chincholi","Chitapur","Gulbarga","Jevargi","Kamalapur","Sedam","Shahapur","Wadi","Yadgir","Bidar","Bhalki","Chitguppa","Homnabad","Hulsur","Kamalnagar","Mauje","Nanegoan","Narayanpet","Sindgi","Surpur","Tadmur","Taj","Udchabal","Venkatapur","Yadgir"], cities: ["Gulbarga","Yadgir","Wadi","Sedam","Aland","Afzalpur","Jevargi","Chitapur","Chincholi","Shahapur","Bidar","Bhalki","Homnabad","Hulsur","Kamalnagar"] },
  "Shimoga": { blocks: ["Shimoga","Bhadravati","Hosanagara","Shikarpur","Sorab","Thirthahalli","Hosanagara","Shimoga","Sorab","Thirthahalli","Bhadravati","Kundapur","Kundgol","Shikarpur","Sorab","Thirthahalli"], cities: ["Shimoga","Bhadravati","Thirthahalli","Shikarpur","Sorab","Hosanagara","Kundapur","Kundgol"] },
  "Udupi": { blocks: ["Udupi","Barkur","Brahmavar","Hebri","Karkala","Kundapur","Kaup","Udupi"], cities: ["Udupi","Karkala","Kundapur","Barkur","Brahmavar","Hebri","Kaup"] },
  // --- Maharashtra ---
  "Ahmednagar": { blocks: ["Ahmednagar","Akole","Jamkhed","Karjat","Kopargaon","Nagar","Nevasa","Parner","Pathardi","Rahta","Sangamner","Sangole","Shevgaon","Shrirampur","Shrigonda","Velhe"], cities: ["Ahmednagar","Sangamner","Shrirampur","Kopargaon","Nevasa","Rahata","Shevgaon","Karjat","Jamkhed","Pathardi","Parner","Akole","Sangole","Velhe"] },
  "Nashik": { blocks: ["Nashik","Deolali","Igatpuri","Trimbakeshwar","Baglan","Malegaon","Nandgaon","Chandwad","Dindori","Peint","Surgana","Yeola","Niphad","Sinnar","Satana","Kalwan","Chandvad","Deola","Malegaon","Nandgaon","Peint","Surgana","Trimbakeshwar","Yeola"], cities: ["Nashik","Malegaon","Sinnar","Yeola","Niphad","Dindori","Trimbak","Igatpuri","Kalwan","Satana","Chandvad","Deola","Baglan","Chandwad","Peint","Surgana"] },
  "Thane": { blocks: ["Thane","Kalyan","Ulhasnagar","Ambarnath","Badlapur","Dombivli","Mira-Bhayandar","Bhiwandi","Shahapur","Murbad","Wada","Vikramgad","Palghar","Vasai","Nallasopara","Talasari","Jawhar","Mokhada","Vikramgad","Palghar"], cities: ["Thane","Kalyan","Dombivli","Ulhasnagar","Badlapur","Mira Road","Bhiwandi","Palghar","Vasai","Nallasopara","Shahapur","Murbad","Wada","Vikramgad","Talasari","Jawhar","Mokhada"] },
  "Raigad": { blocks: ["Alibag","Karjat","Khalapur","Mahad","Mangaon","Mhasala","Murud","Panvel","Pen","Poladpur","Roha","Sangameshwar","Shrivardhan","Sudhagad","Tala","Talasari","Uran"], cities: ["Alibag","Karjat","Pen","Panvel","Roha","Mahad","Mangaon","Murud","Shrivardhan","Sangameshwar","Uran","Poladpur","Sudhagad","Khalapur","Mhasala","Tala"] },
  "Pune": { blocks: ["Pune City","Pune Rural","Baramati","Daund","Indapur","Maval","Mulshi","Purandhar","Velhe","Bhor","Junnar","Akole","Sangamner","Kopargaon","Rahata","Shrirampur","Nevasa","Shevgaon","Pathardi","Parner","Khed","Shirur","Ambegaon","Haveli"], cities: ["Pune","Pimpri-Chinchwad","Lonavala","Talegaon","Saswad","Daund","Shirur","Baramati","Indapur","Junnar","Nevasa","Khed","Ambegaon","Purandhar","Velhe","Bhor","Maval","Mulshi","Kopargaon","Rahata","Shrirampur","Shevgaon","Pathardi","Parner","Haveli"] },
};

const titleCase = (value: string) =>
  value.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function AddressSection() {
  // Store slugged values in state so the Select's `value` matches its
  // SelectItem values. Convert to titleCase only for lookups.
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");

  const stateKey = titleCase(selectedState);
  const availableDistricts = useMemo(
    () => (stateKey ? (districtsByState[stateKey] || []) : []),
    [stateKey]
  );

  const districtKey = titleCase(selectedDistrict);
  const places = useMemo(
    () => (districtKey ? (placesByDistrict[districtKey] || { blocks: [], cities: [] }) : { blocks: [], cities: [] }),
    [districtKey]
  );
  const [blockQuery, setBlockQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [showBlockList, setShowBlockList] = useState(false);
  const [showCityList, setShowCityList] = useState(false);

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
              value={selectedState}
              onValueChange={(val) => {
                setSelectedState(val);
                setSelectedDistrict("");
                setBlockQuery("");
                setCityQuery("");
              }}
            >
              <SelectTrigger id="state">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {states.map((state) => {
                  const val = state.toLowerCase().replace(/\s/g, "-");
                  return (
                    <SelectItem key={state} value={val}>
                      {state}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="district">District *</Label>
            <Select
              name="district"
              value={selectedDistrict}
              disabled={!stateKey || availableDistricts.length === 0}
              onValueChange={(val) => {
                setSelectedDistrict(val);
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
                {availableDistricts.map((district) => {
                  const val = district.toLowerCase().replace(/\s/g, "-");
                  return (
                    <SelectItem key={district} value={val}>
                      {district}
                    </SelectItem>
                  );
                })}
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
            placeholder={districtKey ? "Type to search block" : "Select district first"}
            disabled={!districtKey}
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
            placeholder={districtKey ? "Type to search city" : "Select district first"}
            disabled={!districtKey}
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
            <Input id="pincode" name="pincode" placeholder="Pincode" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="latitude">Latitude</Label>
            <Input id="latitude" name="latitude" type="number" step="any" placeholder="e.g., 28.6139" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="longitude">Longitude</Label>
            <Input id="longitude" name="longitude" type="number" step="any" placeholder="e.g., 77.2090" />
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
