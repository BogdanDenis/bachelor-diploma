import tensorflow as tf
import os
from PIL import Image
import numpy as np
import cv2


def convert_to_opencv(image):
  # RGB -> BGR conversion is performed as well.
  r, g, b = np.array(image).T
  opencv_image = np.array([b, g, r]).transpose()
  return opencv_image


def crop_center(img, cropx, cropy):
  h, w = img.shape[:2]
  startx = w//2-(cropx//2)
  starty = h//2-(cropy//2)
  return img[starty:starty+cropy, startx:startx+cropx]


def resize_down_to_1600_max_dim(image):
  h, w = image.shape[:2]
  if (h < 1600 and w < 1600):
      return image

  new_size = (1600 * w // h, 1600) if (h > w) else (1600, 1600 * h // w)
  return cv2.resize(image, new_size, interpolation=cv2.INTER_LINEAR)


def resize_to_256_square(image):
  h, w = image.shape[:2]
  return cv2.resize(image, (256, 256), interpolation=cv2.INTER_LINEAR)


def update_orientation(image):
  exif_orientation_tag = 0x0112
  if hasattr(image, '_getexif'):
    exif = image._getexif()
    if (exif != None and exif_orientation_tag in exif):
      orientation = exif.get(exif_orientation_tag, 1)
      # orientation is 1 based, shift to zero based and flip/transpose based on 0-based values
      orientation -= 1
      if orientation >= 4:
        image = image.transpose(Image.TRANSPOSE)
      if orientation == 2 or orientation == 3 or orientation == 6 or orientation == 7:
        image = image.transpose(Image.FLIP_TOP_BOTTOM)
      if orientation == 1 or orientation == 2 or orientation == 5 or orientation == 6:
        image = image.transpose(Image.FLIP_LEFT_RIGHT)
  return image


graph_def = tf.GraphDef()
labels = []

filename = "model.pb"
labels_filename = "labels.txt"

with tf.gfile.GFile(filename, 'rb') as f:
  graph_def.ParseFromString(f.read())
  tf.import_graph_def(graph_def, name='')

with open(labels_filename, 'rt') as lf:
  for l in lf:
      labels.append(l.strip())


image_file = 'image.jpg'
image = Image.open(image_file)

image = update_orientation(image)
image = convert_to_opencv(image)

h, w = image.shape[:2]
min_dim = min(h, w)
max_square_image = crop_center(image, min_dim, min_dim)

augmented_image = resize_to_256_square(max_square_image)

with tf.Session() as sess:
  input_tensor_shape = sess.graph.get_tensor_by_name(
      'Placeholder:0').shape.as_list()
network_input_size = input_tensor_shape[1]

augmented_image = crop_center(
  augmented_image, network_input_size, network_input_size)

output_layer = 'loss:0'
input_node = 'Placeholder:0'

with tf.Session() as sess:
  try:
    prob_tensor = sess.graph.get_tensor_by_name(output_layer)
    predictions, = sess.run(prob_tensor, { input_node: [augmented_image] })

    highest_prob_index = np.argmax(predictions)
    print ('Classified as: ' + labels[highest_prob_index])
    print()

    label_index = 0

    for p in predictions:
      truncated_prob = np.float64(np.round(p, 8))
      print (labels[label_index], truncated_prob)
      label_index += 1
  except KeyError:
    print ("Couldn't find classification output layer: " + output_layer + ".")
    print ("Verify this a model exported from an Object Detection project.")
    exit(-1)