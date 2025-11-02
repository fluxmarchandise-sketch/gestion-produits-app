function exportToExcel(products, filename){
    const XLSX = window.XLSX || {};
    let wb = XLSX.utils.book_new();
    let ws_data = [["Code","Nom","Date","Quantité"]];
    products.forEach(p => ws_data.push([p.code,p.name,p.expiry,p.quantity]));
    let ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, "Produits");
    XLSX.writeFile(wb, filename);
}

// تحميل مكتبة XLSX من CDN
const script = document.createElement("script");
script.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
document.head.appendChild(script);