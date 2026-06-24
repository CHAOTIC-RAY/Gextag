import piexif from 'piexifjs';

export const degToDmsRational = (degrees: number) => {
  let d = Math.abs(degrees);
  const deg = Math.floor(d);
  d = d - deg;
  const min = Math.floor(d * 60);
  d = d * 60 - min;
  const sec = Math.round(d * 60 * 10000);

  return [[deg, 1], [min, 1], [sec, 10000]];
};

export const applyMetadata = (
  dataUrl: string,
  lat: number | null,
  lng: number | null,
  description: string,
  keywords: string[],
  artist: string = '',
  copyright: string = '',
  datetime: string = ''
): string => {
  try {
    let exifObj: any = { "0th": {}, "Exif": {}, "GPS": {}, "Interop": {}, "1st": {} };
    
    if (dataUrl.startsWith('data:image/jpeg')) {
        try {
            exifObj = piexif.load(dataUrl);
        } catch (e) {
            console.warn("Could not load existing EXIF", e);
        }
    }

    if (lat !== null && lng !== null) {
      exifObj["GPS"][piexif.GPSIFD.GPSVersionID] = [2, 2, 0, 0];
      exifObj["GPS"][piexif.GPSIFD.GPSLatitudeRef] = lat >= 0 ? "N" : "S";
      exifObj["GPS"][piexif.GPSIFD.GPSLatitude] = degToDmsRational(lat);
      exifObj["GPS"][piexif.GPSIFD.GPSLongitudeRef] = lng >= 0 ? "E" : "W";
      exifObj["GPS"][piexif.GPSIFD.GPSLongitude] = degToDmsRational(lng);
    }

    if (description) {
      exifObj["0th"][piexif.ImageIFD.ImageDescription] = description;
    }

    if (artist) {
      exifObj["0th"][piexif.ImageIFD.Artist] = artist;
    }

    if (copyright) {
      exifObj["0th"][piexif.ImageIFD.Copyright] = copyright;
    }

    if (datetime) {
      exifObj["Exif"][piexif.ExifIFD.DateTimeOriginal] = datetime;
      exifObj["0th"][piexif.ImageIFD.DateTime] = datetime;
    }

    if (keywords && keywords.length > 0) {
      const keywordString = keywords.join(';');
      const ucs2 = [];
      for (let i = 0; i < keywordString.length; i++) {
        ucs2.push(keywordString.charCodeAt(i));
        ucs2.push(0);
      }
      ucs2.push(0);
      ucs2.push(0);
      exifObj["0th"][40094] = ucs2; // XPKeywords
    }

    const exifBytes = piexif.dump(exifObj);
    return piexif.insert(exifBytes, dataUrl);
  } catch (err) {
    console.error("Error applying metadata", err);
    return dataUrl;
  }
};

export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const convertToJpegDataUrl = (dataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (dataUrl.startsWith('data:image/jpeg')) {
            resolve(dataUrl);
            return;
        }
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.95));
            } else {
                reject(new Error("Could not get canvas context"));
            }
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
};
