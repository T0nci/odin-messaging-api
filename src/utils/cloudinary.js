const cloudinary = require("cloudinary").v2;

cloudinary.config({
  secure: true,
});

const uploadImage = async (image, user_id) => {
  await cloudinary.uploader.upload(image, {
    resource_type: "image",
    asset_folder: "messaging_app",

    // this way it gets overwritten for each user
    // and I don't need a delete method
    public_id: user_id,
    overwrite: true,
  });
};

const generateUrl = (public_id) => cloudinary.url(public_id);

const deleteImage = async (publicId) => {
  await cloudinary.uploader.destroy(publicId, {
    invalidate: true,
  });
};

const uploadImageWithPublicId = async (image) => {
  const response = await cloudinary.uploader.upload(image, {
    resource_type: "image",
    asset_folder: "messaging_app",
  });

  return response.public_id;
};

module.exports = {
  uploadImage,
  generateUrl,
  deleteImage,
  uploadImageWithPublicId,
};
