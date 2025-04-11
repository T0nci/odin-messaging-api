const cloudinary = require("cloudinary").v2;

cloudinary.config({
  secure: true,
});

// rewrite this or have another function for the messages
const uploadImage = async (image, user_id) => {
  const response = await cloudinary.uploader.upload(image, {
    resource_type: "image",
    asset_folder: "messaging_app",

    // this way it gets overwritten for each user
    // and I don't need a delete method
    public_id: user_id,
    overwrite: true,
  });

  return response.public_id;
};

const generateUrl = (public_id) => cloudinary.url(public_id);

const deleteImage = async (publicId) => {
  return await cloudinary.uploader.destroy(publicId, {
    invalidate: true,
  });
};

module.exports = {
  uploadImage,
  generateUrl,
  deleteImage,
};
